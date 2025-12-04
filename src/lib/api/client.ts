import { Configuration } from './runtime'
import {
  ApiKeysApi,
  ContactsApi,
  HistorysmsApi,
  ItemsApi,
  LoginApi,
  MoreAdminPrivilegesApi,
  PrivateApi,
  PromoCodesApi,
  SmsApi,
  SystemApi,
  TemplatesApi,
  TicketsApi,
  TransactionsApi,
  UserDataApi,
  UsersApi,
  UtilsApi
} from './apis'

// Get base URL from environment or use default
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create configuration
const config = new Configuration({
  basePath: BASE_URL,
  accessToken: async () => {
    const token = localStorage.getItem('token');
    return token ? `Bearer ${token}` : '';
  }
})

class ApiClient {
  public apiKeys: ApiKeysApi;
  public contacts: ContactsApi;
  public historySms: HistorysmsApi;
  public items: ItemsApi;
  public login: LoginApi;
  public admin: MoreAdminPrivilegesApi;
  public private: PrivateApi;
  public promoCodes: PromoCodesApi;
  public sms: SmsApi;
  public system: SystemApi;
  public templates: TemplatesApi;
  public tickets: TicketsApi;
  public transactions: TransactionsApi;
  public userData: UserDataApi;
  public users: UsersApi;
  public utils: UtilsApi;

  constructor(config: Configuration) {
    this.apiKeys = new ApiKeysApi(config);
    this.contacts = new ContactsApi(config);
    this.historySms = new HistorysmsApi(config);
    this.items = new ItemsApi(config);
    this.login = new LoginApi(config);
    this.admin = new MoreAdminPrivilegesApi(config);
    this.private = new PrivateApi(config);
    this.promoCodes = new PromoCodesApi(config);
    this.sms = new SmsApi(config);
    this.system = new SystemApi(config);
    this.templates = new TemplatesApi(config);
    this.tickets = new TicketsApi(config);
    this.transactions = new TransactionsApi(config);
    this.userData = new UserDataApi(config);
    this.users = new UsersApi(config);
    this.utils = new UtilsApi(config);
  }
}

const api = new ApiClient(config);

// Create and export API client instance
export const apiClient = {
  api
}

// Helper to set auth token
export function setAuthToken(token: string) {
  localStorage.setItem('token', token);
}

// Helper to clear auth token
export function clearAuthToken() {
  localStorage.removeItem('token');
}

// Export configuration for custom instances
export { Configuration }
