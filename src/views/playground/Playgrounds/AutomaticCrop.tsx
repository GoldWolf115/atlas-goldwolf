import React, { useRef, useState } from 'react'

import { ImageCropDialog, ImageCropDialogImperativeHandle } from '@/components'
import { Button } from '@/shared/components'
import { ImageCropData, AssetDimensions } from '@/types/cropper'
import { computeFileHash } from '@/utils/hashing'

export const AutomaticCrop: React.FC = () => {
  const [cropData, setCropData] = useState<ImageCropData>()
  const [initialHash, setInitialHash] = useState('')
  const [automaticCropHash, setAutomaticCropHash] = useState('')

  const initialCropDialogRef = useRef<ImageCropDialogImperativeHandle>(null)
  const automaticCropDialogRef = useRef<ImageCropDialogImperativeHandle>(null)

  const handleInitialCrop = async (
    croppedBlob: Blob,
    url: string,
    assetDimensions: AssetDimensions,
    imageCropData: ImageCropData
  ) => {
    const fileHash = await computeFileHash(croppedBlob)
    setCropData(imageCropData)
    setInitialHash(fileHash)
  }

  const handleAutomaticCrop = async (croppedBlob: Blob) => {
    const fileHash = await computeFileHash(croppedBlob)
    setAutomaticCropHash(fileHash)
  }

  return (
    <>
      <div style={{ display: 'grid', gridGap: '10px', width: '250px' }}>
        <Button onClick={() => initialCropDialogRef.current?.open()}>initial crop</Button>
        <Button onClick={() => automaticCropDialogRef.current?.open(undefined, cropData)}>automatic crop</Button>
      </div>
      <div>
        <p>Initial hash: {initialHash}</p>
        <p>Automatic crop hash: {automaticCropHash}</p>
      </div>
      <ImageCropDialog ref={initialCropDialogRef} imageType="avatar" onConfirm={handleInitialCrop} />
      <ImageCropDialog ref={automaticCropDialogRef} imageType="avatar" onConfirm={handleAutomaticCrop} />
    </>
  )
}
