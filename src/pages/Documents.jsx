import { useMemo } from 'react'
import DocumentHub, { salesDocumentProjectOption } from '../components/DocumentHub'
import useStore from '../store/useStore'

const SALES_DOCUMENT_PROJECTS = [
  { id: 'beachwaters', name: 'Beachwaters' },
  { id: 'drift', name: 'Drift' },
  { id: 'longstead', name: 'Longstead' },
]

export default function Documents() {
  const {
    projects,
    documents,
    profile,
    currentUser,
    addDocument,
    updateDocument,
    deleteDocument,
    updateBatchDocuments,
    deleteBatchDocuments,
  } = useStore()
  const projectOptions = useMemo(() => [
    ...projects,
    ...SALES_DOCUMENT_PROJECTS.map(salesDocumentProjectOption),
  ], [projects])

  return (
    <DocumentHub
      projects={projectOptions}
      documents={documents}
      profile={profile}
      currentUser={currentUser}
      addDocument={addDocument}
      updateDocument={updateDocument}
      deleteDocument={deleteDocument}
      updateBatchDocuments={updateBatchDocuments}
      deleteBatchDocuments={deleteBatchDocuments}
      title="Documents"
      showHeader
    />
  )
}
