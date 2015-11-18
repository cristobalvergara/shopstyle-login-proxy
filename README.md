# shopstyle-login-proxy

This proxy server allows to make authenticated API requests against shopstyle and CMS API servers.

## Installation

Assuming node.js and npm are already installed:

```
git clone https://github.com/cristobalvergara/shopstyle-login-proxy.git
cd shopstyle-login-proxy
npm install
```

## Usage

### Start the server

Start the server listening on port 6333:
```
node .
```

Start the server listening on port 8000:
```
node . --port 8000
```

Use the login API from qa and make the authenticated request against prod:
```
node . --login "https://cvergara:popsugar@api.shopstyleqa.com" --redirect "https://api.shopstyle.com"
```

The *login* argument specifies the *protocol* (http or https), *username*, *password*, and *server* the login request is made against. The *redirect* argument is used to specify the *protocol* and *server* the actual request is made against. Note that the path and query string are specified as part of the request to the proxy server. The protocol used to make the actual request to the API server is the *protocol* specified in the *redirect* argument. The request to the proxy server should always go through http.

### Making authenticated requests

If the *--login* and *--redirect* parameters are specified, you can just go ahead and make the request directly against your localhost and the proxy server will do the actual login and authenticated API request for you:

```
curl 'localhost:6333/api/v2/shoppingProfiles?pid=shopstyle'
```

If you don't specify the above mentioned arguments or if you want to override them either because you want to login as a different user or you want to access another server without restarting the proxy server you can use the *x-login* and *x-redirect* request headers:

```
curl -H "x-login: https://cvergara:popsugar@api.shopstyleqa.com" -H "x-redirect: https://api.shopstyleqa.com" "localhost:6333/api/v2/shoppingProfiles?pid=shopstyle"
```

The format of the *x-login* and *x-redirect* request headers is analogous to the format of the *login* and *redirect* arguments for the proxy server command.

General format:

```
curl -H "x-login: protocol://username:password@server" -H "x-redirect: protocol://api-server" 'localhost:6333/path?queryString'
```

The pid used for the login request is always the same as the one used in the request against the API. The *x-pid* header allows to specify the pid used for login independently of the pid used for the actual request. Used only if a pid is not going to be provided in the request for testing purposes or if the pid for login is purposely intended to be different. Note that if the pid for login is different than the pid for the request, then the request will fail with 401. This header is used for testing requests where an error is expected. If no pid is found in the *x-pid* header nor in the request against the API, then *shopstyle* is used for the login request (the login request only, the real request to the API is still sent as is, without a pid).

```
curl -H "x-login: https://cvergara:popsugar@api.shopstyleqa.com" -H "x-pid: iOS_app_v3" -H "x-redirect: https://api.shopstyleqa.com" -H "content-type: application/json" 'localhost:6333/api/v2/shoppingProfiles?pid=iOS_app_v3'
```

This query returns a 401:

```
curl -H "x-login: https://cvergara:popsugar@api.shopstyleqa.com" -H "x-pid: iOS_app_v3" -H "x-redirect: https://api.shopstyleqa.com" -H "content-type: application/json" 'localhost:6333/api/v2/shoppingProfiles?pid=shopstyle'
```

This query successfully logs in using the iOS_app_v3 pid but fails with 400 because the pid is missing in the actual request:

```
curl -H "x-login: https://cvergara:popsugar@api.shopstyleqa.com" -H "x-pid: iOS_app_v3" -H "x-redirect: https://api.shopstyleqa.com" -H "content-type: application/json" 'localhost:6333/api/v2/shoppingProfiles'
```
