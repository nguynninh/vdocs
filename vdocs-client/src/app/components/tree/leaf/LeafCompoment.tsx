"use client";

import React, { useEffect, useRef, useState } from "react";
import { Collapse, type CollapseProps } from "antd";
import { RightOutlined, PlusOutlined, EllipsisOutlined, FileOutlined } from "@ant-design/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import css from "./LeafCompoment.module.css";

type LeafItem = NonNullable<CollapseProps["items"]>[number];
type DropMode = "before" | "child";

type LeafComponentProps = {
    id: React.Key;
    label: React.ReactNode;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    items?: LeafItem;
    styles?: React.CSSProperties;
    active?: boolean;
    onExpandChange?: (id: React.Key, expanded: boolean) => void;
    onClick?: (id: React.Key) => void;
    onMore?: (id: React.Key) => void;
    onAdd?: (id: React.Key) => void;
    onMove?: (dragId: React.Key, targetId: React.Key, mode: DropMode) => void;
    renderMoreMenu?: (id: React.Key) => React.ReactNode;
};

const DRAG_START_DISTANCE = 4;
let activeDragId: React.Key | null = null;
let activeDrop: { id: React.Key; mode: DropMode } | null = null;

function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest("a, button, input, textarea, select"));
}

const LeafComponent: React.FC<LeafComponentProps> = (props: LeafComponentProps) => {
    const { id, label, icon, children, items, styles, active, onClick, onMore, onAdd, onMove, onExpandChange, renderMoreMenu } = props;
    const [moreOpen, setMoreOpen] = useState(false);
    const collapseItem = items ?? { key: id ?? String(label), label, children };
    const itemKey = collapseItem.key ?? id;

    const [hover, setHover] = useState(false);
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
    const [dropActive, setDropActive] = useState(false);
    const [dropMode, setDropMode] = useState<DropMode>("before");
    const rootRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const suppressClickRef = useRef(false);

    useEffect(() => {
        let previousUserSelect = "";

        function handleMouseMove(event: MouseEvent) {
            const start = dragStartRef.current;
            if (!start) return;
            const hasMoved =
                Math.abs(event.clientX - start.x) > DRAG_START_DISTANCE ||
                Math.abs(event.clientY - start.y) > DRAG_START_DISTANCE;
            if (hasMoved) {
                event.preventDefault();
                if (!isDraggingRef.current) {
                    previousUserSelect = document.body.style.userSelect;
                    document.body.style.userSelect = "none";
                    activeDragId = id;
                }
                isDraggingRef.current = true;
                setDragPosition({ x: event.clientX, y: event.clientY });
            }
        }

        function handleMouseUp() {
            if (!dragStartRef.current && !isDraggingRef.current) return;

            if (isDraggingRef.current) {
                document.body.style.userSelect = previousUserSelect;
                if (activeDrop && activeDrop.id !== id) {
                    onMove?.(id, activeDrop.id, activeDrop.mode);
                }
                suppressClickRef.current = true;
                window.setTimeout(() => {
                    suppressClickRef.current = false;
                }, 0);
            }
            dragStartRef.current = null;
            isDraggingRef.current = false;
            activeDragId = null;
            activeDrop = null;
            setDragPosition(null);
            setDropActive(false);
            setDropMode("before");
        }

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [id, onMove]);
    const handleMore: React.MouseEventHandler<HTMLSpanElement> = (event) => {
        event.stopPropagation();
        if (renderMoreMenu) {
            setMoreOpen(true);
            return;
        }
        onMore?.(id);
    };
    const handleAdd: React.MouseEventHandler<HTMLSpanElement> = (event) => {
        event.stopPropagation();
        onAdd?.(id);
    };
    const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
        if (isInteractiveTarget(event.target)) return;
        if (suppressClickRef.current) {
            event.stopPropagation();
            return;
        }
        event.stopPropagation();
        onClick?.(id);
    };
    const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
        if (event.button !== 0 || isInteractiveTarget(event.target) || (event.target as HTMLElement).closest(`.${css.action}`)) return;
        event.preventDefault();
        event.stopPropagation();
        dragStartRef.current = { x: event.clientX, y: event.clientY };
        isDraggingRef.current = false;
    };
    const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
        const currentHeader = rootRef.current?.querySelector(".ant-collapse-header");
        const isCurrentHeader = Boolean(currentHeader?.contains(event.target as Node));
        const isDropTarget = activeDragId !== null && activeDragId !== id && isCurrentHeader;
        const headerRect = currentHeader?.getBoundingClientRect();
        const mode: DropMode =
            headerRect && event.clientY > headerRect.top + headerRect.height / 2 ? "child" : "before";
        setHover(isCurrentHeader);
        setDropActive(isDropTarget);
        setDropMode(mode);
        if (isDropTarget) activeDrop = { id, mode };
    };
    const handleExpandChange: CollapseProps["onChange"] = (activeKey) => {
        const activeKeys = Array.isArray(activeKey) ? activeKey : [activeKey];
        onExpandChange?.(id, activeKeys.includes(String(itemKey)));
    };

    return (
        <div
            ref={rootRef}
            className={`${css.root} ${active ? css.active : ""} ${dragPosition ? css.dragging : ""}`}
            style={styles}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                setHover(false);
                setDropActive(false);
                setDropMode("before");
                if (activeDrop?.id === id) activeDrop = null;
            }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}>
            {dropActive && <div className={dropMode === "child" ? css.dropChildLine : css.dropLine} />}
            <Collapse
                className={css.leafCollapse}
                ghost
                collapsible="icon"
                style={{ cursor: "pointer" }}
                onChange={handleExpandChange}
                expandIcon={({ isActive }) => (
                    hover && React.Children.count(collapseItem.children) > 0 ? (
                        <RightOutlined
                            className={css.action}
                            rotate={isActive ? 90 : 0}
                            style={{ fontSize: 12 }}
                        />
                    ) : (
                        icon ?? (
                        <FileOutlined
                            style={{ fontSize: 12, color: "black" }}
                        />
                        )
                    )
                )}
                items={[
                    {
                        ...collapseItem,
                        key: itemKey,
                        extra: hover || moreOpen ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                {renderMoreMenu ? (
                                    <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
                                        <DropdownMenuTrigger
                                            nativeButton={false}
                                            render={
                                                <span className={css.action} onClick={handleMore}>
                                                    <EllipsisOutlined />
                                                </span>
                                            }
                                        />
                                        <DropdownMenuContent
                                            align="start"
                                            className="w-56"
                                            onClick={(event: React.MouseEvent) => event.stopPropagation()}
                                        >
                                            {renderMoreMenu(id)}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <span className={css.action} onClick={handleMore}>
                                        <EllipsisOutlined />
                                    </span>
                                )}
                                <span className={css.action} onClick={handleAdd}>
                                    <PlusOutlined />
                                </span>
                            </div>
                        ) : null,
                    },
                ]}
            />
            {dragPosition && (
                <div
                    className={css.dragPreview}
                    style={{ left: dragPosition.x + 12, top: dragPosition.y + 8 }}>
                    {label}
                </div>
            )}
        </div>
    );
};

export default LeafComponent;
