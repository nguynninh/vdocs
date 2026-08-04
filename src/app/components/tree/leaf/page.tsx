"use client";

import LeafComponent from "./LeafCompoment";

const ExamplePage = () => {
    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                margin: "10px 5px",
            }}>
            <LeafComponent
                id="root"
                label="Check cấu hình SDK"
                styles={{ width: "100%", flex: 1 }}
                onClick={(id) => console.log(id, "Leaf clicked")}
                onMore={(id) => console.log(id, "More clicked")}
                onAdd={(id) => console.log(id, "Add clicked")}
                onExpandChange={(id, expanded) => console.log(id, "expand change", expanded)}
            />
        </div>
    );
};

export default ExamplePage;
