# A suspension that knows where it is

![npm](https://img.shields.io/npm/v/@lomray/consistent-suspense)
![GitHub](https://img.shields.io/github/license/Lomray-Software/consistent-suspense)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=consistent-suspense&metric=coverage)](https://sonarcloud.io/summary/new_code?id=consistent-suspense)

React `useId()` doesn't return a stable ID when used inside `<Suspense>`. This is a huge problem that slows down the development of libraries for concurrent mode in React. [Read related issue.](https://github.com/facebook/react/issues/24669)

## Getting started

The package is distributed using [npm](https://www.npmjs.com/), the node package manager.

```
npm i --save @lomray/consistent-suspense
```

## How to use
```typescript jsx
import { ConsistentSuspenseProvider, Suspense, useId } from '@lomray/consistent-suspense';

/**
 * 1. Wrap your root component in ConsistentSuspenseProvider
 * 2. Use <Suspense> component from lib
 */
const App: FC = () => {
    const [state] = useState();

    return (
        <ConsistentSuspenseProvider>
          <Suspense>
            <SomeComponent />
          </Suspense>
        </ConsistentSuspenseProvider>
    )
}

/**
 * 3. Now any components inside ConsistentSuspenseProvider can generate consistent id's
 */
const SomeComponent: FC = () => {
    const id = useId();
    
    return (
        <div>I'm have the same id on server and client: {id}</div>
    )
}
```

## Bugs and feature requests

Bug or a feature request, [please open a new issue](https://github.com/Lomray-Software/consistent-suspense/issues/new).

## License
Made with 💚

Published under [MIT License](./LICENSE).
