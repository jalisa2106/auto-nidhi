import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockInsuranceCos } from '../../lib/mockData'

export default function InsuranceCompaniesPage() {
  return (
    <>
      <PageHeader title="Insurance Companies" subtitle="Insurance company master" />
      <DataTable
        rows={mockInsuranceCos}
        searchKeys={['name']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',     label: 'ID'             },
          { key: 'name',   label: 'Name'           },
          { key: 'person', label: 'Contact Person' },
          { key: 'mobile', label: 'Mobile'         },
        ]}
      />
    </>
  )
}
