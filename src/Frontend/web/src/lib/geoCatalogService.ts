import { apiClient } from './apiClient'

export interface CountryCatalogItem {
  id: string
  code: string
  name: string
}

export interface StateCatalogItem {
  id: string
  countryId: string
  countryCode: string
  code: string
  name: string
}

export const geoCatalogService = {
  async getCountries(): Promise<CountryCatalogItem[]> {
    const response = await apiClient.get<{ success: boolean; data: CountryCatalogItem[] }>('/catalogs/countries')
    return response.data.data || []
  },

  async getStates(countryId?: string): Promise<StateCatalogItem[]> {
    const query = countryId ? `?countryId=${encodeURIComponent(countryId)}` : ''
    const response = await apiClient.get<{ success: boolean; data: StateCatalogItem[] }>(`/catalogs/states${query}`)
    return response.data.data || []
  }
}
