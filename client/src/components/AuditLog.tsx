interface Props { panicId: string }

export default function AuditLog({ panicId }: Props) {
  return <div data-panic-id={panicId} />;
}
