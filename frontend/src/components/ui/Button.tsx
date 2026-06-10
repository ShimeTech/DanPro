type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

export default function Button({
  children,
  variant = 'primary',
  style,
  ...props
}: ButtonProps) {
  const styles = {
    primary: {
      background: '#2563eb',
      color: '#fff',
    },
    secondary: {
      background: '#e5e7eb',
      color: '#111827',
    },
    danger: {
      background: '#dc2626',
      color: '#fff',
    },
  };

  return (
    <button
      {...props}
      style={{
        border: 'none',
        borderRadius: 8,
        padding: '10px 14px',
        cursor: 'pointer',
        fontWeight: 600,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}