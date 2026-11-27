import { Table, type TableProps } from 'antd'
import type { ComponentProps } from 'react'

function FocusableTable(props: ComponentProps<'table'>) {
  return <table {...props} tabIndex={0} />
}

export function InventoryTable<Row extends object>(props: TableProps<Row>) {
  return (
    <Table<Row> {...props} size="middle"
      components={props.scroll?.x ? { table: FocusableTable, ...props.components } : props.components} />
  )
}
