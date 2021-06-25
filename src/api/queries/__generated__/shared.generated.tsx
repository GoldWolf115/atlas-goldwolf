import { gql } from '@apollo/client'

import * as Types from './baseTypes.generated'
import { BasicWorkerFieldsFragment } from './workers.generated'
import { BasicWorkerFieldsFragmentDoc } from './workers.generated'

export type DataObjectFieldsFragment = {
  __typename?: 'DataObject'
  id: string
  createdAt: Date
  size: number
  liaisonJudgement: Types.LiaisonJudgement
  ipfsContentId: string
  joystreamContentId: string
  liaison?: Types.Maybe<{ __typename?: 'Worker' } & BasicWorkerFieldsFragment>
}

export const DataObjectFieldsFragmentDoc = gql`
  fragment DataObjectFields on DataObject {
    id
    createdAt
    size
    liaison {
      ...BasicWorkerFields
    }
    liaisonJudgement
    ipfsContentId
    joystreamContentId
  }
  ${BasicWorkerFieldsFragmentDoc}
`
