import type { LinkAccess } from "../response/DocumentPermission.ts";

export interface UpdateDocumentAccessRequest {
  linkAccess: LinkAccess;
}
