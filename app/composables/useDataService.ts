import { DataService } from '~/services/data'

let service: DataService | undefined

export function useDataService() {
  return (service ??= new DataService())
}
