type Column<T> = {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
};

export default function DataTable<T>({
  columns,
  data,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f9fafb' }}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: 14,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, columnIndex) => (
                  <td
                    key={columnIndex}
                    style={{
                      padding: 12,
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: 14,
                    }}
                  >
                    {typeof column.accessor === 'function'
                      ? column.accessor(row)
                      : String(row[column.accessor] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}