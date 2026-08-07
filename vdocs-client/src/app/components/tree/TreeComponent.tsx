"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback, useMemo, useState } from 'react';
import LeafComponent from './leaf/LeafCompoment';
import css from './TreeComponent.module.css';

type DropMode = "before" | "child";

export interface TreeDataNode {
    key: React.Key;
    title: React.ReactNode | ((node: TreeDataNode) => React.ReactNode);
    link?: string;
    isLeaf?: boolean;
    children?: TreeDataNode[];
}

export interface TreeReorderUpdate {
    id: React.Key;
    parentId: React.Key | null;
    order: number;
}

interface TreeComponentProps {
    treeData: TreeDataNode[];
    onParentChange?: (id: React.Key, parentId: React.Key | null) => void;
    onReorder?: (updates: TreeReorderUpdate[]) => void;
    onExpandChange?: (id: React.Key, expanded: boolean) => void;
    onNodeClick?: (id: React.Key) => void;
    onAdd?: (id: React.Key) => void;
    renderMoreMenu?: (id: React.Key) => React.ReactNode;
}

const App: React.FC<TreeComponentProps> = (props: TreeComponentProps) => {
    const { treeData, onParentChange, onReorder, onExpandChange, onNodeClick, onAdd, renderMoreMenu } = props;
    const pathname = usePathname();
    const [nodeState, setNodeState] = useState({ source: treeData, nodes: treeData });

    if (nodeState.source !== treeData) {
        setNodeState({ source: treeData, nodes: treeData });
    }

    const nodes = nodeState.source === treeData ? nodeState.nodes : treeData;

    const handleMove = useCallback((dragId: React.Key, targetId: React.Key, mode: DropMode) => {
        const oldParentId = findParentKey(nodes, dragId);
        const moved = moveNode(nodes, dragId, targetId, mode);
        if (!moved) return;
        setNodeState({ source: treeData, nodes: moved.nodes });
        onParentChange?.(dragId, moved.parentId);

        const getSiblings = (parentId: React.Key | null): TreeDataNode[] => {
            if (parentId === null) return moved.nodes;
            const parent = findNode(moved.nodes, parentId);
            return parent?.children ?? [];
        };

        const affectedParentIds = new Set<React.Key | null>([oldParentId, moved.parentId]);
        const updates: TreeReorderUpdate[] = [];
        affectedParentIds.forEach((parentId) => {
            getSiblings(parentId).forEach((node, index) => {
                updates.push({ id: node.key, parentId, order: index });
            });
        });
        onReorder?.(updates);
    }, [nodes, treeData, onParentChange, onReorder]);

    const leafTreeData = useMemo(
        () => renderLeafComponents(nodes, pathname, handleMove, onExpandChange, onNodeClick, onAdd, renderMoreMenu),
        [nodes, pathname, handleMove, onExpandChange, onNodeClick, onAdd, renderMoreMenu]
    );

    return (
        <div className={css.fullWidthTree}>
            {leafTreeData}
        </div>
    );
};

const renderLeafComponents = (
    nodes: TreeDataNode[],
    pathname: string,
    onMove?: (dragId: React.Key, targetId: React.Key, mode: DropMode) => void,
    onExpandChange?: (id: React.Key, expanded: boolean) => void,
    onNodeClick?: (id: React.Key) => void,
    onAdd?: (id: React.Key) => void,
    renderMoreMenu?: (id: React.Key) => React.ReactNode
): React.ReactNode =>
    nodes.map((node) => {
        const children = node.children?.length ? (
            <div className={css.children}>
                {renderLeafComponents(node.children, pathname, onMove, onExpandChange, onNodeClick, onAdd, renderMoreMenu)}
            </div>
        ) : undefined;
        const title = typeof node.title === "function" ? node.title(node) : node.title;
        const label = node.link ? (
            <Link href={node.link} className={css.treeLink} onClick={() => onNodeClick?.(node.key)}>
                {title}
            </Link>
        ) : title;
        const active = node.link === pathname;

        return (
            <LeafComponent
                key={node.key}
                id={node.key}
                label={label}
                active={active}
                onMove={onMove}
                onExpandChange={onExpandChange}
                onAdd={onAdd}
                renderMoreMenu={renderMoreMenu}
                styles={{ width: "100%" }}>
                {children}
            </LeafComponent>
        );
    });

function removeNode(nodes: TreeDataNode[], key: React.Key): [TreeDataNode[], TreeDataNode | null] {
    let removed: TreeDataNode | null = null;

    const next = nodes
        .map((node) => {
            if (node.key === key) {
                removed = node;
                return null;
            }

            if (!node.children?.length) return node;
            const [children, childRemoved] = removeNode(node.children, key);
            if (childRemoved) removed = childRemoved;
            return { ...node, children };
        })
        .filter((node): node is TreeDataNode => node !== null);

    return [next, removed];
}

function insertBefore(nodes: TreeDataNode[], targetKey: React.Key, nodeToInsert: TreeDataNode): TreeDataNode[] {
    return nodes.flatMap((node) => {
        if (node.key === targetKey) return [nodeToInsert, node];
        if (!node.children?.length) return [node];
        return [{ ...node, children: insertBefore(node.children, targetKey, nodeToInsert) }];
    });
}

function insertAsChild(nodes: TreeDataNode[], targetKey: React.Key, nodeToInsert: TreeDataNode): TreeDataNode[] {
    return nodes.map((node) => {
        if (node.key === targetKey) {
            return { ...node, children: [...(node.children ?? []), nodeToInsert] };
        }
        if (!node.children?.length) return node;
        return { ...node, children: insertAsChild(node.children, targetKey, nodeToInsert) };
    });
}

function hasNode(nodes: TreeDataNode[], key: React.Key): boolean {
    return nodes.some((node) => node.key === key || (node.children?.length ? hasNode(node.children, key) : false));
}

function findNode(nodes: TreeDataNode[], key: React.Key): TreeDataNode | null {
    for (const node of nodes) {
        if (node.key === key) return node;
        if (node.children?.length) {
            const found = findNode(node.children, key);
            if (found) return found;
        }
    }
    return null;
}

function findParentKey(nodes: TreeDataNode[], key: React.Key, parentKey: React.Key | null = null): React.Key | null {
    for (const node of nodes) {
        if (node.key === key) return parentKey;
        if (node.children?.length) {
            const found = findParentKey(node.children, key, node.key);
            if (found !== null) return found;
        }
    }
    return null;
}

function moveNode(
    nodes: TreeDataNode[],
    dragKey: React.Key,
    targetKey: React.Key,
    mode: DropMode
): { nodes: TreeDataNode[]; parentId: React.Key | null } | null {
    if (dragKey === targetKey || !findNode(nodes, targetKey)) return null;

    const [withoutDragged, dragged] = removeNode(nodes, dragKey);
    if (!dragged || !hasNode(withoutDragged, targetKey)) return null;

    const parentId = mode === "child" ? targetKey : findParentKey(withoutDragged, targetKey);
    return {
        nodes: mode === "child"
            ? insertAsChild(withoutDragged, targetKey, dragged)
            : insertBefore(withoutDragged, targetKey, dragged),
        parentId,
    };
}

export default App;
