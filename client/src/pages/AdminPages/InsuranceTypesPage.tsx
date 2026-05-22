import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockInsuranceTypes } from '../../lib/mockData'

export default function InsuranceTypesPage() {
  return (
    <>
      <PageHeader title="Insurance Types" subtitle="Insurance type master" />
      <DataTable
        rows={mockInsuranceTypes}
        searchKeys={['name']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',   label: 'ID'   },
          { key: 'name', label: 'Name' },
        ]}
      />
    </>
  )
}
