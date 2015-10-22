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

The *x-pid* header specifies the pid used for logging in to the server. The default value is *shopstyle*:

```
curl -H "x-redirect: https://cvergara:popsugar@api.shopstyleqa.com" -H "x-pid: iOS_app_v3" -H "content-type: application/json" 'localhost:6333/api/v2/shoppingProfiles?pid=iOS_app_v3'
```
