import type { ReactNode } from "react";

type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
};

type TableProps<T> = {
  columns: Array<Column<T>>;
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
  rows: T[];
};

export function Table<T extends Record<string, unknown>>({
  columns,
  emptyMessage = "No rows available.",
  getRowKey,
  rows
}: TableProps<T>) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}>
                {columns.map((column) => (
                  <td key={String(column.key)}>
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="table-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
