"use client";

import React, { useState } from "react";
import { Collapse, type CollapseProps } from "antd";
import { RightOutlined, PlusOutlined, EllipsisOutlined, FileOutlined } from "@ant-design/icons";
import css from "./LeafCompoment.module.css";

type LeafItem = NonNullable<CollapseProps["items"]>[number];

type LeafComponentProps = {
    id: React.Key;
    label: React.ReactNode;
    children?: React.ReactNode;
    items?: LeafItem;
    styles?: React.CSSProperties;
    onExpandChange?: (id: React.Key, expanded: boolean) => void;
    onClick?: (id: React.Key) => void;
    onMore?: (id: React.Key) => void;
    onAdd?: (id: React.Key) => void;
};

const LeafComponent: React.FC<LeafComponentProps> = (props: LeafComponentProps) => {
    const { id, label, children, items, styles, onClick, onMore, onAdd, onExpandChange } = props;
    const collapseItem = items ?? { key: id ?? String(label), label, children };
    const itemKey = collapseItem.key ?? id;

    const [hover, setHover] = useState(false);
    const handleMore: React.MouseEventHandler<HTMLSpanElement> = (event) => {
        event.stopPropagation();
        onMore?.(id);
    };
    const handleAdd: React.MouseEventHandler<HTMLSpanElement> = (event) => {
        event.stopPropagation();
        onAdd?.(id);
    };
    const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
        event.stopPropagation();
        onClick?.(id);
    };
    const handleExpandChange: CollapseProps["onChange"] = (activeKey) => {
        const activeKeys = Array.isArray(activeKey) ? activeKey : [activeKey];
        onExpandChange?.(id, activeKeys.includes(String(itemKey)));
    };

    return (
        <div
            style={styles}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={handleClick}>
            <Collapse
                className={css.leafCollapse}
                ghost
                collapsible="icon"
                onChange={handleExpandChange}
                expandIcon={({ isActive }) => (
                    hover && React.Children.count(collapseItem.children) > 0 ? (
                        <RightOutlined
                            className={css.action}
                            rotate={isActive ? 90 : 0}
                            style={{ fontSize: 12 }}
                        />
                    ) : (
                        <FileOutlined
                            style={{ fontSize: 12, color: "black" }}
                        />
                    )
                )}
                items={[
                    {
                        ...collapseItem,
                        key: itemKey,
                        extra: hover ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                <span className={css.action} onClick={handleMore}>
                                    <EllipsisOutlined />
                                </span>
                                <span className={css.action} onClick={handleAdd}>
                                    <PlusOutlined />
                                </span>
                            </div>
                        ) : null,
                    },
                ]}
            />
        </div>
    );
};

export default LeafComponent;
