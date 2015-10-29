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

### Making authenticated requests

```
curl -H "x-redirect: https://cvergara:popsugar@api.shopstyleqa.com" -H "content-type: application/json" 'localhost:6333/api/v2/shoppingProfiles?pid=shopstyle'
```

The *x-redirect* request header specifies the *protocol* (http or https), *username*, *password*, and *server* the request is made against. Note that the path and query string are specified as part of the request to the proxy server. The protocol used to make the actual request to the API server is the *protocol* specified in the *x-redirect* header. The request to the proxy server should always go through http.

```
curl -H "x-redirect: protocol://username:password@server" -H "content-type: application/json" 'localhost:6333/path?queryString'
```

The *x-pid* header specifies the pid used for logging in to the server. Used only if a pid is not going to be provided in the request to test or if the pid for login is purposely intended to be different. Note that if the pid for login is different than the pid for the request, then the request will fail with 401. This header is used for testing requests where an error is expected. If no pid is found in the *x-pid* header nor in the request, then *shopstyle* is used for the login request (the login request only, the real request is still sent as is).

```
curl -H "x-redirect: https://cvergara:popsugar@api.shopstyleqa.com" -H "x-pid: iOS_app_v3" -H "content-type: application/json" 'localhost:6333/api/v2/shoppingProfiles?pid=iOS_app_v3'
```
