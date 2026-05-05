type Column<T> = {
  key: keyof T;
  label: string;
};

type TableProps<T> = {
  columns: Array<Column<T>>;
  rows: T[];
};

export function Table<T extends Record<string, unknown>>({ columns, rows }: TableProps<T>) {
  return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={String(column.key)} style={{ borderBottom: "1px solid #d1d5db", textAlign: "left" }}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => (
              <td key={String(column.key)} style={{ borderBottom: "1px solid #f3f4f6", padding: "8px 0" }}>
                {String(row[column.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

