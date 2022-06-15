import { ChangeEvent, FC, useEffect, useState } from 'react'

import { TabItem } from '@/components/Tabs'
import { Button, TextButton } from '@/components/_buttons/Button'
import { SvgActionClose, SvgActionNewTab, SvgAlertsError24, SvgAlertsWarning24 } from '@/components/_icons'
import { Checkbox } from '@/components/_inputs/Checkbox'
import { FormField } from '@/components/_inputs/FormField'
import { Input } from '@/components/_inputs/Input'
import { Select } from '@/components/_inputs/Select'
import { availableNodes } from '@/config/availableNodes'
import { BUILD_ENV, availableEnvs } from '@/config/envs'
import { absoluteRoutes } from '@/config/routes'
import { NODE_URL } from '@/config/urls'
import { useConfirmationModal } from '@/providers/confirmationModal'
import { useEnvironmentStore } from '@/providers/environment'
import { useSnackbar } from '@/providers/snackbars'
import { ActiveUserState, useUserStore } from '@/providers/user'
import { SentryLogger } from '@/utils/logs'

import {
  CloseButton,
  Container,
  CustomNodeUrlWrapper,
  HorizontalSpacedContainer,
  StyledTabs,
  VerticalSpacedContainer,
} from './AdminOverlay.styles'

const ENVIRONMENT_NAMES: Record<string, string> = {
  production: 'Main Testnet',
  development: 'Atlas Dev Testnet',
  next: 'Atlas Next Testnet',
  local: 'Local chain',
}
const environmentsItems = availableEnvs()
  .filter((item) => ENVIRONMENT_NAMES[item])
  .map((item) => ({ name: ENVIRONMENT_NAMES[item], value: item }))

const TABS: TabItem[] = [{ name: 'Env' }, { name: 'State' }, { name: 'User' }]

export const AdminOverlay: FC = () => {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [selectedTabIdx, setSelectedTabIdx] = useState(0)

  useEffect(() => {
    // handle Ctrl+Shift+D keypress
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'D') return

      const control = e.getModifierState('Control')
      const shift = e.getModifierState('Shift')

      if (!control || !shift) return

      setOverlayOpen((currentValue) => !currentValue)
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [])

  const handleCloseClick = () => {
    setOverlayOpen(false)
  }

  const handleTabSelect = (tabIdx: number) => {
    setSelectedTabIdx(tabIdx)
  }

  if (!overlayOpen) {
    return null
  }

  return (
    <Container>
      <CloseButton icon={<SvgActionClose />} variant="tertiary" onClick={handleCloseClick} size="small" />
      <HorizontalSpacedContainer>
        <TextButton variant="tertiary" icon={<SvgActionNewTab />} to={absoluteRoutes.viewer.index()}>
          Home
        </TextButton>
        <TextButton variant="tertiary" icon={<SvgActionNewTab />} to={absoluteRoutes.studio.index()}>
          Studio
        </TextButton>
        <TextButton variant="tertiary" icon={<SvgActionNewTab />} to={absoluteRoutes.playground.index()}>
          Playground
        </TextButton>
      </HorizontalSpacedContainer>
      <StyledTabs tabs={TABS} onSelectTab={handleTabSelect} selected={selectedTabIdx} />
      {selectedTabIdx === 0 && <EnvTab />}
      {selectedTabIdx === 1 && <StateTab />}
      {selectedTabIdx === 2 && <UserTab />}
    </Container>
  )
}

const EnvTab: FC = () => {
  const {
    targetDevEnv,
    nodeOverride,
    actions: { setTargetDevEnv, setNodeOverride },
  } = useEnvironmentStore()

  const determinedNode = nodeOverride || NODE_URL
  const determinedNodeFound = availableNodes.find((node) => node.value === determinedNode)
  const [usingCustomNodeUrl, setUsingCustomNodeUrl] = useState(!determinedNodeFound)
  const [customNodeUrl, setCustomNodeUrl] = useState(determinedNode)
  const resetActiveUser = useUserStore((state) => state.actions.resetActiveUser)

  const handleEnvironmentChange = (value?: string | null) => {
    if (!value) {
      return
    }
    setTargetDevEnv(value)
    setNodeOverride(null)
    resetActiveUser()

    window.location.reload()
  }

  const handleNodeChange = (value?: string | null) => {
    setNodeOverride(value ?? null)
    window.location.reload()
  }

  const handleCustomNodeCheckboxChange = () => {
    if (usingCustomNodeUrl) {
      setUsingCustomNodeUrl(false)
      setNodeOverride(null)
    } else {
      setUsingCustomNodeUrl(true)
      setCustomNodeUrl(determinedNode)
    }
  }

  const handleCustomNodeUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCustomNodeUrl(e.target.value)
  }

  const handleSaveCustomNodeUrlClick = () => {
    setNodeOverride(customNodeUrl)
  }

  return (
    <VerticalSpacedContainer>
      <FormField label="Chain">
        <Select
          items={environmentsItems}
          onChange={handleEnvironmentChange}
          value={targetDevEnv}
          disabled={BUILD_ENV === 'production'}
        />
      </FormField>

      <FormField label="Node">
        <Checkbox label="Custom node URL" value={usingCustomNodeUrl} onChange={handleCustomNodeCheckboxChange} />
        {!usingCustomNodeUrl ? (
          <Select items={availableNodes} onChange={handleNodeChange} value={determinedNode} />
        ) : (
          <CustomNodeUrlWrapper>
            <Input value={customNodeUrl} onChange={handleCustomNodeUrlChange} />
            <Button onClick={handleSaveCustomNodeUrlClick} size="large">
              Save
            </Button>
          </CustomNodeUrlWrapper>
        )}
      </FormField>
    </VerticalSpacedContainer>
  )
}

const StateTab: FC = () => {
  const { displaySnackbar } = useSnackbar()
  const [openModal, closeModal] = useConfirmationModal()

  const handleExportClick = () => {
    const storageKeys = Object.keys(window.localStorage)
    const storage = storageKeys.reduce((acc, key) => {
      const rawValue = window.localStorage.getItem(key)
      if (rawValue) {
        try {
          acc[key] = JSON.parse(rawValue)
        } catch (e) {
          acc[key] = rawValue
        }
      }

      return acc
    }, {} as Record<string, unknown>)
    const jsonStorage = JSON.stringify(storage)

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStorage))
    linkElement.setAttribute('download', `atlas-export-${new Date().toISOString()}.json`)
    linkElement.click()
  }

  const handleFileChange = async (e: Event) => {
    try {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const fileText = await file.text()
      const storage = JSON.parse(fileText)
      Object.keys(storage).forEach((key) => {
        window.localStorage.setItem(key, JSON.stringify(storage[key]))
      })
      displaySnackbar({
        title: 'Local state updated',
        iconType: 'success',
      })
    } catch (error) {
      SentryLogger.error('Failed to import local state', 'AdminOverlay', error)
      displaySnackbar({
        title: 'JSON file seems to be corrupted',
        description: 'Please try again with different file',
        iconType: 'error',
      })
    }
  }

  const handleImportClick = () => {
    const inputElement = document.createElement('input')
    inputElement.setAttribute('type', 'file')
    inputElement.onchange = handleFileChange
    inputElement.click()
  }

  const handleClearClick = () => {
    openModal({
      type: 'destructive',
      title: 'Clear local state?',
      description:
        'Cleaning local state will remove all your personal data, including watched videos, followed channels, video drafts and more. This will not impact ownership of your accounts.',
      primaryButton: {
        text: 'Clear',
        onClick: () => {
          window.localStorage.clear()
          window.location.reload()
          closeModal()
        },
      },
      secondaryButton: {
        text: 'Cancel',
        onClick: () => closeModal(),
      },
    })
  }

  return (
    <VerticalSpacedContainer>
      <Button onClick={handleExportClick} variant="secondary" size="large">
        Export local state
      </Button>
      <Button onClick={handleImportClick} variant="secondary" size="large" icon={<SvgAlertsWarning24 />}>
        Import local state
      </Button>
      <Button onClick={handleClearClick} variant="secondary" size="large" icon={<SvgAlertsError24 />}>
        Clear local state
      </Button>
    </VerticalSpacedContainer>
  )
}

const UserTab: FC = () => {
  const {
    accountId,
    memberId,
    channelId,
    actions: { setActiveUser, resetActiveUser },
  } = useUserStore()

  const [accountIdValue, setAccountIdValue] = useState(accountId)
  const [memberIdValue, setMemberIdValue] = useState(memberId)
  const [channelIdValue, setChannelIdValue] = useState(channelId)

  useEffect(() => {
    const handler = (state: ActiveUserState) => {
      setAccountIdValue(state.accountId)
      setMemberIdValue(state.memberId)
      setChannelIdValue(state.channelId)
    }
    return useUserStore.subscribe(handler)
  }, [])

  const handleAccountIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountIdValue(e.target.value)
  }

  const handleMemberIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMemberIdValue(e.target.value)
  }

  const handleChannelIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setChannelIdValue(e.target.value)
  }

  const handleSaveClick = () => {
    setActiveUser({
      accountId: accountIdValue,
      memberId: memberIdValue,
      channelId: channelIdValue,
    })
  }

  const handleRestClick = () => {
    resetActiveUser()
  }

  return (
    <VerticalSpacedContainer>
      <HorizontalSpacedContainer>
        <FormField label="Account ID">
          <Input value={accountIdValue || ''} onChange={handleAccountIdChange} />
        </FormField>
        <FormField label="Member ID">
          <Input value={memberIdValue || ''} onChange={handleMemberIdChange} />
        </FormField>
        <FormField label="Channel ID">
          <Input value={channelIdValue || ''} onChange={handleChannelIdChange} />
        </FormField>
      </HorizontalSpacedContainer>
      <Button onClick={handleSaveClick} size="large" variant="secondary">
        Save changes
      </Button>
      <Button onClick={handleRestClick} size="large" variant="secondary">
        Reset user
      </Button>
    </VerticalSpacedContainer>
  )
}
