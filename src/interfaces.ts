
export interface SocketSession {
    isAlive: boolean,
    data   : SocketPackageData,
    groups : string[],
}

export interface SocketPackage {
    info: SocketPackageInfo,
    data: SocketPackageData
}

export interface SocketPackageInfo {
    action   : 'group' | 'call' | 'auth' | 'broadcast',
    request  : string | number,
    group    : string,
    packageID: number
}

export interface SocketPackageData {
    [key: string | number]: any
}

export interface SocketPackageResponse {
    info    : SocketPackageInfo,
    error   : any,
    response: SocketPackageData
}

export interface SocketServerCallsStack {
    [key: number]: SocketFn
}

export interface SocketListeners {
    [key: string]: SocketFn[]
}

export type SocketFn     = (error: any, response: SocketPackageData) => void


export type AuthLoginFn  = (data:any,setSession:(data:SocketPackageData)=> void ,closeSocketInternal:() => void,SendToClient:SocketFn) => void
export type AuthLogoutFn = (sessionData:SocketPackageData,SendToClient:SocketFn) => void
export type MiddlewareFn = (data:SocketPackageData,response:SocketFn,sessionData:SocketPackageData,groups:string[]) => void

export interface SocketRouter {
    [key:string | number]:MiddlewareFn
}