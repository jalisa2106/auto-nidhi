import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'

const rows = [
  { id: 'BA001', bank: 'HDFC', ac: '50100xxxxxx', ifsc: 'HDFC0001234', area: 'Pune' },
]

export default function BankAccountsPage() {
  return (
    <>
      <PageHeader title="Own Bank Accounts" subtitle="Company bank accounts for inward / outward mapping" />
      <DataTable
        rows={rows}
        searchKeys={['bank']}
        onAdd={() => {}}
        addLabel="Add account"
        columns={[
          { key: 'id',   label: 'ID'   },
          { key: 'bank', label: 'Bank' },
          { key: 'ac',   label: 'A/C'  },
          { key: 'ifsc', label: 'IFSC' },
          { key: 'area', label: 'Area' },
        ]}
      />
    </>
  )
}
