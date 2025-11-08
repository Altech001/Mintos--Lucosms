import {
  Configuration,
  ApiKeysApi,
  ContactsApi,
  ItemsApi,
  LoginApi,
  PrivateApi,
  PromoCodesApi,
  SmsApi,
  TemplatesApi,
  TicketsApi,
  UserDataApi,
  UsersApi,
  UtilsApi,
} from './index';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiClient {
  private config: Configuration;
  public api: {
    apiKeys: ApiKeysApi;
    contacts: ContactsApi;
    items: ItemsApi;
    login: LoginApi;
    private: PrivateApi;
    promoCodes: PromoCodesApi;
    sms: SmsApi;
    templates: TemplatesApi;
    tickets: TicketsApi;
    userData: UserDataApi;
    users: UsersApi;
    utils: UtilsApi;
  };

  constructor() {
    this.config = new Configuration({
      basePath: BASE_URL,
      accessToken: () => {
        const token = this.getToken();
        return token ? `Bearer ${token}` : '';
      },
    });
    this.api = this.createApiInstances();
  }

  private createApiInstances() {
    return {
      apiKeys: new ApiKeysApi(this.config),
      contacts: new ContactsApi(this.config),
      items: new ItemsApi(this.config),
      login: new LoginApi(this.config),
      private: new PrivateApi(this.config),
      promoCodes: new PromoCodesApi(this.config),
      sms: new SmsApi(this.config),
      templates: new TemplatesApi(this.config),
      tickets: new TicketsApi(this.config),
      userData: new UserDataApi(this.config),
      users: new UsersApi(this.config),
      utils: new UtilsApi(this.config),
    };
  }

  setToken(token: string) {
    localStorage.setItem('access_token', token);
    // The accessToken function in the config will now pick up the new token
    // We need to recreate the instances for them to get the new config context if the implementation requires it.
    this.api = this.createApiInstances();
  }

  clearToken() {
    localStorage.removeItem('access_token');
    // The accessToken function in the config will now return null
    this.api = this.createApiInstances();
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const apiClient = new ApiClient();