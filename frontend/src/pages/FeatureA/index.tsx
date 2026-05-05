import { Table } from "../../components/Table";

const rows = [
  { name: "Example item", status: "Ready" },
  { name: "Another item", status: "Draft" }
];

export function FeatureA() {
  return (
    <div>
      <h1>Feature A</h1>
      <Table
        columns={[
          { key: "name", label: "Name" },
          { key: "status", label: "Status" }
        ]}
        rows={rows}
      />
    </div>
  );
}

