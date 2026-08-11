import type {
  LarkDepartment,
  LarkDepartmentListResponse,
  LarkDirectoryUser,
  LarkTenantAccessTokenResponse,
  LarkUserListResponse,
} from "../dtos/response/LarkResponse.ts";

const LARK_TENANT_TOKEN_URL =
  "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal";
const LARK_DEPARTMENTS_URL = "https://open.larksuite.com/open-apis/contact/v3/departments";
const LARK_USERS_BY_DEPARTMENT_URL =
  "https://open.larksuite.com/open-apis/contact/v3/users/find_by_department";

// The org directory rarely changes within a session, and Lark paginates at
// 50 rows/call — fetching it fully on every keystroke would mean dozens of
// upstream calls per search. Cache the whole tree for a few minutes instead.
const DIRECTORY_CACHE_TTL_MS = 5 * 60_000;

export interface DirectoryMember {
  larkUserId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  jobTitle: string | null;
  departmentId: string | null;
}

export interface DirectoryDepartment {
  id: string;
  name: string;
  parentId: string;
  memberCount: number;
}

interface Directory {
  departments: DirectoryDepartment[];
  members: DirectoryMember[];
}

function requireLarkAppId() {
  const appId = process.env.LARK_APP_ID ?? process.env.NEXT_PUBLIC_LARK_APP_ID;

  if (!appId) {
    throw new Error("Missing LARK_APP_ID or NEXT_PUBLIC_LARK_APP_ID");
  }

  return appId;
}

function requireLarkAppSecret() {
  const appSecret = process.env.LARK_APP_SECRET;

  if (!appSecret) {
    throw new Error("Missing LARK_APP_SECRET");
  }

  return appSecret;
}

let cachedTenantToken: { token: string; expiresAt: number } | null = null;

async function getTenantAccessToken(): Promise<string> {
  if (cachedTenantToken && cachedTenantToken.expiresAt > Date.now()) {
    return cachedTenantToken.token;
  }

  const response = await fetch(LARK_TENANT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: requireLarkAppId(),
      app_secret: requireLarkAppSecret(),
    }),
  });

  const payload = (await response.json()) as LarkTenantAccessTokenResponse;

  if (!response.ok || payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(
      payload.msg ?? `Failed to fetch Lark tenant access token (code: ${payload.code})`
    );
  }

  cachedTenantToken = {
    token: payload.tenant_access_token,
    // Refresh a little early so a request never runs on an about-to-expire token.
    expiresAt: Date.now() + (payload.expire ?? 7200) * 1000 - 60_000,
  };

  return cachedTenantToken.token;
}

async function larkGet<T>(url: string, params: Record<string, string>): Promise<T> {
  const token = await getTenantAccessToken();
  const query = new URLSearchParams(params);

  const response = await fetch(`${url}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = (await response.json()) as T & { code: number; msg?: string };

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg ?? `Lark API request failed (code: ${payload.code})`);
  }

  return payload;
}

async function fetchAllDepartments(): Promise<LarkDepartment[]> {
  const departments: LarkDepartment[] = [];
  const queue = ["0"];
  const seenParents = new Set<string>();

  while (queue.length > 0) {
    const parentId = queue.shift()!;

    if (seenParents.has(parentId)) continue;
    seenParents.add(parentId);

    let pageToken = "";
    let hasMore = true;

    while (hasMore) {
      const payload = await larkGet<LarkDepartmentListResponse>(LARK_DEPARTMENTS_URL, {
        parent_department_id: parentId,
        department_id_type: "open_department_id",
        page_size: "50",
        ...(pageToken ? { page_token: pageToken } : {}),
      });

      const items = payload.data?.items ?? [];
      departments.push(...items);
      queue.push(...items.map((item) => item.open_department_id ?? item.department_id));

      hasMore = Boolean(payload.data?.has_more);
      pageToken = payload.data?.page_token ?? "";
    }
  }

  return departments;
}

async function fetchMembersOfDepartment(departmentId: string): Promise<LarkDirectoryUser[]> {
  const members: LarkDirectoryUser[] = [];
  let pageToken = "";
  let hasMore = true;

  while (hasMore) {
    const payload = await larkGet<LarkUserListResponse>(LARK_USERS_BY_DEPARTMENT_URL, {
      department_id: departmentId,
      department_id_type: "open_department_id",
      user_id_type: "open_id",
      page_size: "50",
      ...(pageToken ? { page_token: pageToken } : {}),
    });

    members.push(...(payload.data?.items ?? []));
    hasMore = Boolean(payload.data?.has_more);
    pageToken = payload.data?.page_token ?? "";
  }

  return members;
}

let cachedDirectory: { directory: Directory; expiresAt: number } | null = null;
let directoryInFlight: Promise<Directory> | null = null;

async function buildDirectory(): Promise<Directory> {
  const larkDepartments = await fetchAllDepartments();

  const departments: DirectoryDepartment[] = larkDepartments.map((department) => ({
    id: department.open_department_id ?? department.department_id,
    name: department.name,
    parentId: department.parent_department_id,
    memberCount: department.member_count ?? 0,
  }));

  const membersByUserId = new Map<string, DirectoryMember>();

  for (const department of departments) {
    const larkMembers = await fetchMembersOfDepartment(department.id);

    for (const member of larkMembers) {
      const larkUserId = member.open_id ?? member.user_id;

      if (!larkUserId) continue;

      membersByUserId.set(larkUserId, {
        larkUserId,
        name: member.name,
        email: member.email ?? null,
        avatar: member.avatar?.avatar_240 ?? null,
        jobTitle: member.job_title ?? null,
        departmentId: department.id,
      });
    }
  }

  return { departments, members: Array.from(membersByUserId.values()) };
}

async function getDirectory(): Promise<Directory> {
  if (cachedDirectory && cachedDirectory.expiresAt > Date.now()) {
    return cachedDirectory.directory;
  }

  if (directoryInFlight) {
    return directoryInFlight;
  }

  directoryInFlight = buildDirectory().finally(() => {
    directoryInFlight = null;
  });

  const directory = await directoryInFlight;
  cachedDirectory = { directory, expiresAt: Date.now() + DIRECTORY_CACHE_TTL_MS };

  return directory;
}

async function listDepartments(): Promise<DirectoryDepartment[]> {
  const directory = await getDirectory();
  return directory.departments;
}

async function searchMembers(input: {
  departmentId?: string;
  query?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: DirectoryMember[]; total: number }> {
  const directory = await getDirectory();
  const normalizedQuery = input.query?.trim().toLowerCase();

  const filtered = directory.members.filter((member) => {
    if (input.departmentId && member.departmentId !== input.departmentId) {
      return false;
    }

    if (normalizedQuery) {
      const haystack = `${member.name} ${member.email ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    }

    return true;
  });

  const start = (input.page - 1) * input.pageSize;

  return {
    items: filtered.slice(start, start + input.pageSize),
    total: filtered.length,
  };
}

async function findMembersByIds(larkUserIds: string[]): Promise<DirectoryMember[]> {
  const directory = await getDirectory();
  const idSet = new Set(larkUserIds);
  return directory.members.filter((member) => idSet.has(member.larkUserId));
}

export const larkService = {
  listDepartments,
  searchMembers,
  findMembersByIds,
};
