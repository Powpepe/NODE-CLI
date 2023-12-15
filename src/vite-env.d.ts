/// <reference types="vite/client" />
import { Tron, TronLink, TronWeb } from "@agrozyme/types-tronweb";
// declare module "tronweb" {
//   export * from "@agrozyme/types-tronweb";
//   import TronWeb from "@agrozyme/types-tronweb";
//   export default TronWeb;
// }

// declare module "tron"

declare global {
  interface Window {
    tron?: Tron;
    tronLink?: TronLink;
    tronWeb?: TronWeb;
  }
}
