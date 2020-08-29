import axios, { AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';
import OAuthManager from '../OAuth/OAuthManager';
import { RequestType } from './WebServiceEnums';
import { convertMapToObject } from '../common';
import { AppConfig } from '../../config/AppConfig';
import { IAppConfig } from '../../lib/interfaces';
import { IOAuthService } from '../../lib/interfaces/IOAuthService';

import container, { lazyInject } from '../../lib/di-container/inversify.config';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../lib/di-container/types';
import { IWebService } from './IWebService';

let config: IAppConfig = AppConfig.getInstance();
const queryString = require('querystring');

@injectable()
export default class WebService implements IWebService {
  public apiUrl: string = 'https://api.careerbuilder.com';
  public extraHeaders: Map<string, string> = new Map<string, string>();
  private developerKey: string = config.whiteLabelConfig.developerKey;
  // @inject(TYPES.OAuthService)
  // private oauthService: IOAuthService;//= container.get(TYPES.OAuthService);
  @lazyInject(TYPES.OAuthService)
  private oauthService: IOAuthService = container.get(TYPES.OAuthService);

  public async makeGetRequest<T>(
    path: string,
    data?: object,
    cancelToken?: CancelTokenSource,
  ): Promise<AxiosResponse<T>> {
    return await this.makeWebCall<T>(path, RequestType.GET, data, false, cancelToken);
  }

  public async makePostRequest<T>(
    path: string,
    data?: object | any,
    isJsonRequest: boolean = true,
    isXMLResponse: boolean = false,
    isOutputJson: boolean = false,
  ): Promise<AxiosResponse<T>> {

    //console.log('boolean value', isOutputJson);
    return await this.makeWebCall<T>(path, RequestType.POST, data, isJsonRequest, undefined, isXMLResponse, isOutputJson);
  }

  public async makePutRequest<T>(
    path: string,
    data?: object,
    isJsonRequest: boolean = true,
  ): Promise<AxiosResponse<T>> {
    return await this.makeWebCall<T>(path, RequestType.PUT, data, isJsonRequest, undefined);
  }

  public async makeDeleteRequest<T>(
    path: string,
    data?: object,
    cancelToken?: CancelTokenSource,
  ): Promise<AxiosResponse<T>> {
    return await this.makeWebCall<T>(path, RequestType.DELETE, data, false, cancelToken);
  }

  private async makeWebCall<T>(
    path: string,
    requestType: RequestType,
    data?: object,
    isJsonRequest: boolean = true,
    cancelToken?: CancelTokenSource,
    isXMLResponse: boolean = false,
    isOutputJson: boolean = false
  ): Promise<AxiosResponse<T>> {
    await OAuthManager.getInstance().loadOAuthToken();
    const fullUrl = `${this.apiUrl}${path}`;
    const request =
      requestType === RequestType.GET
        ? this.buildGetRequest(fullUrl, data)
        : requestType === RequestType.DELETE
          ? this.buildDeleteRequest(fullUrl, data)
          : requestType === RequestType.PUT
            ? this.buildPutRequest(fullUrl, data)
            : this.buildPostRequest(fullUrl, data, isJsonRequest, isXMLResponse, isOutputJson);

    const headers = new Map<string, string>();
    headers.set('Authorization', `Bearer ${OAuthManager.getInstance().OAuthToken}`);
    headers.set('HostSite', 'US');
    this.extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
    request.headers = convertMapToObject(headers);
    request.cancelToken = cancelToken == null ? undefined : cancelToken.token;
    //console.log('web service request -->', request);
    var response = await axios.request<T>(request);
    return response;
  }

  public async makeExternalWebCall<T>(
    path: string,
    requestType: RequestType,
    data?: object,
    isJsonRequest: boolean = true,
    cancelToken?: CancelTokenSource,
  ): Promise<AxiosResponse<T>> {
    await OAuthManager.getInstance().loadOAuthToken();
    const fullUrl = `${path}`;
    const request =
      requestType === RequestType.GET
        ? this.buildGetRequest(fullUrl, data)
        : requestType === RequestType.DELETE
          ? this.buildDeleteRequest(fullUrl, data)
          : requestType === RequestType.PUT
            ? this.buildPutRequest(fullUrl, data)
            : this.buildPostRequest(fullUrl, data, isJsonRequest);

    const headers = new Map<string, string>();
    this.extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
    request.headers = convertMapToObject(headers);
    request.cancelToken = cancelToken == null ? undefined : cancelToken.token;
    return await axios.request<T>(request);
  }

  private buildGetRequest(baseUrl: string, data?: object): AxiosRequestConfig {
    const developerKeyParameter = `?DeveloperKey=${this.developerKey}`;
    //const authtoken = `?OAuthToken=${OAuthManager.instance.OAuthToken}`;
    const url =
      data != null
        ? `${baseUrl}${developerKeyParameter}&${queryString.stringify(data)}`
        : `${baseUrl}${developerKeyParameter}`;
    const request: AxiosRequestConfig = {
      method: RequestType.GET,
      url,
    };
    // console.log('buildGetRequest request===', request);
    return request;
  }

  private buildDeleteRequest(baseUrl: string, data?: object): AxiosRequestConfig {
    const developerKeyParameter = `?DeveloperKey=${this.developerKey}`;
    const url =
      data != null
        ? `${baseUrl}${developerKeyParameter}&${queryString.stringify(data)}`
        : `${baseUrl}${developerKeyParameter}`;
    const request: AxiosRequestConfig = {
      method: RequestType.DELETE,
      url,
    };
    return request;
  }

  private buildPutRequest(baseUrl: string, data?: object, isJson: boolean = true): AxiosRequestConfig {
    const developerKeyParameter = `?DeveloperKey=${this.developerKey}`;
    const url = `${baseUrl}${developerKeyParameter}`;
    const request: AxiosRequestConfig = {
      method: RequestType.PUT,
      url,
      responseType: 'json',
    };
    data != null && (isJson ? (request.data = data) : (request.data = queryString.stringify(data)));
    return request;
  }

  private buildPostRequest(
    baseUrl: string,
    data?: object,
    isJson: boolean = true,
    isXMLResponse: boolean = false,
    isOutputJson: boolean = false,
  ): AxiosRequestConfig {

    let developerKeyParameter = `?DeveloperKey=${this.developerKey}`;
    if (isOutputJson) {
      developerKeyParameter = developerKeyParameter + '&Outputjson=true';
    }
    const url = `${baseUrl}${developerKeyParameter}`;
    const request: AxiosRequestConfig = {
      method: RequestType.POST,
      url,
      responseType: isXMLResponse ? 'text' : 'json',
    };
    data != null && (isJson ? (request.data = data) : (request.data = queryString.stringify(data)));

    return request;
  }
}
