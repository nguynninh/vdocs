"use client";

import React, { useMemo } from 'react';
import type { TreeDataNode } from 'antd';
import LeafComponent from './leaf/LeafCompoment';
import css from './TreeComponent.module.css';

interface TreeComponentProps {
    treeData: TreeDataNode[];
}

const App: React.FC<TreeComponentProps> = (props: TreeComponentProps) => {
    const { treeData } = props;
    const leafTreeData = useMemo(() => renderLeafComponents(treeData), [treeData]);

    return (
        <div className={css.fullWidthTree}>
            {leafTreeData}
        </div>
    );
};

const renderLeafComponents = (nodes: TreeDataNode[]): React.ReactNode =>
    nodes.map((node) => {
        const children = node.children?.length ? (
            <div className={css.children}>
                {renderLeafComponents(node.children)}
            </div>
        ) : undefined;
        const title = typeof node.title === "function" ? node.title(node) : node.title;

        return (
            <LeafComponent
                key={node.key}
                id={node.key}
                label={title}
                styles={{ width: "100%" }}>
                {children}
            </LeafComponent>
        );
    });

export default App;
