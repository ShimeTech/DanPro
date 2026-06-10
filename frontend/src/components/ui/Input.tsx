type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({ label, style, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
          {label}
        </label>
      )}

      <input
        {...props}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          outline: 'none',
          ...style,
        }}
      />
    </div>
  );
}