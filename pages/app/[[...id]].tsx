import React, { FC, useState } from 'react'
import { Pane, Dialog, majorScale } from 'evergreen-ui'
import { useRouter } from 'next/router'
import { useSession, getSession } from 'next-auth/client'
import Logo from '../../components/logo'
import FolderList from '../../components/folderList'
import NewFolderButton from '../../components/newFolderButton'
import User from '../../components/user'
import FolderPane from '../../components/folderPane'
import DocPane from '../../components/docPane'
import NewFolderDialog from '../../components/newFolderDialog'

import { connectToDB, folder, doc } from '../../db'

interface iProps {
  folders?: any[]
  activeFolder?: any
  activeDoc?: any
  activeDocs?: any[]
}

const App: FC<iProps> = ({ folders, activeDoc, activeFolder, activeDocs }) => {
  const router = useRouter()
  const [session, loading] = useSession()
  const [newFolderIsShown, setIsShown] = useState(false)
  const [allFolders, setAllFolders] = useState(folders || [])

  const handleNewFolder = async (name: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/folder/`, {
      method: 'POST',
      body: JSON.stringify({ name }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const { data } = await res.json()
    // update local state
    setAllFolders((state) => [...state, data])
  }

  const Page = () => {
    if (activeDoc) {
      return <DocPane folder={activeFolder} doc={activeDoc} />
    }

    if (activeFolder) {
      return <FolderPane folder={activeFolder} docs={activeDocs} />
    }

    return null
  }

  if (loading) return null

  if (!loading && !session) {
    return (
      <Dialog
        isShown
        title="Session expired"
        confirmLabel="Ok"
        hasCancel={false}
        hasClose={false}
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEscapePress={false}
        onConfirm={() => router.push('/signin')}
      >
        Sign in to continue
      </Dialog>
    )
  }

  return (
    <Pane position="relative">
      <Pane width={300} position="absolute" top={0} left={0} background="tint2" height="100vh" borderRight>
        <Pane padding={majorScale(2)} display="flex" alignItems="center" justifyContent="space-between">
          <Logo />

          <NewFolderButton onClick={() => setIsShown(true)} />
        </Pane>
        <Pane>
          <FolderList folders={allFolders} />
        </Pane>
      </Pane>
      <Pane marginLeft={300} width="calc(100vw - 300px)" height="100vh" overflowY="auto" position="relative">
        <User user={session.user} />
        <Page />
      </Pane>
      <NewFolderDialog close={() => setIsShown(false)} isShown={newFolderIsShown} onNewFolder={handleNewFolder} />
    </Pane>
  )
}

App.defaultProps = {
  folders: [],
}

export async function getServerSideProps(ctx) {
  const session = await getSession(ctx)

  console.log({ session })

  if (!session) {
    return {
      props: {
        session,
      },
    }
  }

  // connexting the db;
  const { db } = await connectToDB()

  const result: iProps = {}

  // first getting all the folders;
  const folders = await folder.getFolders(db, session.user.id)
  result.folders = folders

  const [folderParamId, documentParamId] = ctx.params.id || []

  if (folderParamId) {
    // we are going to fetch the documents of the current selected folder;
    const activeFolder = await folders.find((f) => f._id === folderParamId)
    const activeDocs = await doc.getDocsByFolder(db, activeFolder._id)
    result.activeFolder = activeFolder
    result.activeDocs = activeDocs

    if (documentParamId) {
      const activeDoc = await doc.getOneDoc(db, documentParamId)
      result.activeDoc = activeDoc
    }
  }

  return {
    props: {
      session,
      ...result,
    },
  }
}

/**
 * Catch all handler. Must handle all different page
 * states.
 * 1. Folders - none selected
 * 2. Folders => Folder selected
 * 3. Folders => Folder selected => Document selected
 *
 * An unauth user should not be able to access this page.
 *
 * @param context
 */
export default App
