import Button from './Button';

type PageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
}: PageHeaderProps) {
  return (
    <div
      style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {description && (
          <p style={{ marginTop: 6, color: '#6b7280' }}>{description}</p>
        )}
      </div>

      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}