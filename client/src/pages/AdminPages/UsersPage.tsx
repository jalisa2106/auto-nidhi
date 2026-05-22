import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockUsers } from '../../lib/mockData'

export default function UsersPage() {
  return (
    <>
      <PageHeader title="User Management" subtitle="Role and access management for the system" />
      <DataTable
        rows={mockUsers}
        searchKeys={['first', 'last', 'email']}
        onAdd={() => {}}
        addLabel="Invite user"
        columns={[
          { key: 'id',        label: 'ID'        },
          { key: 'first',     label: 'First'     },
          { key: 'last',      label: 'Last'      },
          { key: 'email',     label: 'Email'     },
          { key: 'role',      label: 'Role',   render: (r) => <span className="badge badge-blue">{r.role}</span>   },
          { key: 'active',    label: 'Status', render: (r) => r.active
              ? <span className="badge badge-green">Active</span>
              : <span className="badge badge-red">Inactive</span> },
          { key: 'lastLogin', label: 'Last Login' },
        ]}
      />
    </>
  )
}
