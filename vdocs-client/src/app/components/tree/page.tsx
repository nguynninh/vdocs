'use client';

import React from 'react';
import {TreeDataNode} from './TreeComponent';
import TreeComponent from './TreeComponent';

const treeData: TreeDataNode[] = [
  {
    title: "Workspace",
    key: "workspace",
    children: [
      {
        title: "Documents",
        key: "documents",
        children: [
          {
            title: "HR",
            key: "hr",
            children: [
              {
                title: "Employee Handbook",
                key: "employee-handbook",
              },
              {
                title: "Leave Policy",
                key: "leave-policy",
              },
            ],
          },
          {
            title: "Engineering",
            key: "engineering",
            children: [
              {
                title: "API Design",
                key: "api-design",
                isLeaf: true,
              },
              {
                title: "Coding Convention",
                key: "coding-convention",
              },
            ],
          },
        ],
      },
      {
        title: "Projects",
        key: "projects",
        children: [
          {
            title: "Identity Service",
            key: "identity-service",
            children: [
              {
                title: "Authentication",
                key: "authentication",
              },
              {
                title: "Device Management",
                key: "device-management",
              },
            ],
          },
          {
            title: "CMS",
            key: "cms",
            children: [
              {
                title: "Dashboard",
                key: "dashboard",
              },
              {
                title: "User Management",
                key: "user-management",
              },
            ],
          },
        ],
      },
      {
        title: "Trash",
        key: "trash",
      },
    ],
  },
];

const App: React.FC = () => {
    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                margin: "10px 5px",
            }}>
            <TreeComponent
                treeData={treeData}
                onParentChange={(id, parentId) => console.log(id, "changed parent to", parentId)}
            />
        </div>
    );
};

export default App;
