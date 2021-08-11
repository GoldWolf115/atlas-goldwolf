import React from 'react'
import shallow from 'zustand/shallow'

import { absoluteRoutes } from '@/config/routes'
import { useUser } from '@/providers'
import { useUploadsStore } from '@/providers/uploadsManager/store'
import { AssetUpload } from '@/providers/uploadsManager/types'
import { Button, EmptyFallback } from '@/shared/components'
import { SvgGlyphUpload } from '@/shared/icons'

import { StyledText, UploadsContainer } from './MyUploadsView.style'
import { UploadStatusGroup } from './UploadStatusGroup'
import { UploadStatusGroupSkeletonLoader } from './UploadStatusGroup/UploadStatusGroupSkeletonLoader'

type GroupByParentObjectIdAcc = {
  [key: string]: AssetUpload[]
}

export const MyUploadsView: React.FC = () => {
  const { activeChannelId } = useUser()

  const channelUploads = useUploadsStore(
    (state) => state.uploads.filter((asset) => asset.owner === activeChannelId),
    shallow
  )
  const isSyncing = useUploadsStore((state) => state.isSyncing)

  // Grouping all assets by parent id (videos, channel)
  const groupedUploadsState = Object.values(
    channelUploads.reduce((acc: GroupByParentObjectIdAcc, asset) => {
      if (!asset) {
        return acc
      }
      const key = asset.parentObject.id
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(asset)
      return acc
    }, {})
  )

  const hasUploads = groupedUploadsState.length > 0
  const placeholderItems = Array.from({ length: 5 }).map((_, idx) => <UploadStatusGroupSkeletonLoader key={idx} />)

  return (
    <UploadsContainer>
      <StyledText variant="h2">My uploads</StyledText>
      {isSyncing ? (
        placeholderItems
      ) : hasUploads ? (
        groupedUploadsState.map((files) => <UploadStatusGroup key={files[0].parentObject.id} uploads={files} />)
      ) : (
        <EmptyFallback
          title="No ongoing uploads"
          subtitle="You will see status of each ongoing upload here."
          button={
            <Button icon={<SvgGlyphUpload />} variant="secondary" size="large" to={absoluteRoutes.studio.editVideo()}>
              Upload video
            </Button>
          }
        />
      )}
    </UploadsContainer>
  )
}
