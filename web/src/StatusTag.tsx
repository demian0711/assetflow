import { Tag } from 'antd'

export function StatusTag({ label, tone = 'default' }: { label: string; tone?: string }) {
  return <Tag className={'status-tag status-tag--' + tone}>{label}</Tag>
}
