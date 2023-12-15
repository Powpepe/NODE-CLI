import Abi from "@/utils/abi/pope.json";

import { ethers } from "ethers";
import { useEffect, useRef, useState } from "react";
const rpcs = new Set();
rpcs.add("https://bsc.publicnode.com");
rpcs.add("https://binance.llamarpc.com");
rpcs.add("https://bsc-dataseed.binance.org");

const getNext = (): (() => string) => {
  const iterator = rpcs.values();
  return () => {
    return iterator.next().value;
  };
};

const contract = "0xF4816156055Ef0C7Ed80c38BD1d790AE036b9384";
let getGenerator = getNext();
let rpc = getGenerator();
let startInterval: NodeJS.Timeout;
let starting = false;
let stoping = false;
export default function Home() {
  const [isCustomRpc, setCustomRpc] = useState(false);
  const [address, setAddress] = useState("");
  const [pk, setPk] = useState("");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const scrollRef = useRef<any>();
  const currentRpcRef = useRef<any>();
  const [balance, setBalance] = useState<string>();
  const [limit, setLimit] = useState(10);

  const mineHash = async (
    target: ethers.BigNumber,
    challenge: ethers.BigNumber,
    fromAddress: string
  ) => {
    let i = 0;
    const calculateHash = (nonce: ethers.BigNumber) => {
      const hash = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ["uint256", "address", "uint256"],
          [challenge.toString(), fromAddress, nonce.toString()]
        )
      );
      return hash;
    };
    while (true) {
      const minValue = ethers.BigNumber.from(0);
      const maxValue = ethers.constants.MaxUint256;

      function generateRandomValue(min: any, max: any) {
        const range = max.sub(min);
        const randomBytes = ethers.utils.randomBytes(32);
        const randomValue = ethers.BigNumber.from(randomBytes);
        const normalizedRandom = randomValue.mod(range).add(min);

        if (normalizedRandom.lte(0)) {
          return normalizedRandom.abs();
        }
        if (normalizedRandom.lt(min)) {
          return normalizedRandom.add(range);
        }

        return normalizedRandom;
      }
      const nonce = generateRandomValue(minValue, maxValue);
      const randomValue = calculateHash(nonce);
      if (target.gte(randomValue)) {
        return nonce;
      }
      if (stoping) {
        return false;
      }
      setEventLog((state) => {
        state.push(`Random Vale:${nonce}\n`);
        state.push(`Generator times:${i}\n`);
        return [...state];
      });
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
      i++;
    }
  };
  const start = async () => {
    if (starting) return;
    setEventLog((state) => {
      state.push(`Start Mine...\n`);
      return [...state];
    });
    starting = true;
    let retryCount = 0;
    const Pow = getContract();
    const difficulty = await Pow.difficulty();
    const maxValue = ethers.constants.MaxUint256;
    const target = maxValue.shr(difficulty.toNumber());
    const wallet = new ethers.Wallet(pk, getClient());
    const challenge = await Pow.challenge();

    const fromAddress = wallet.address;
    setEventLog((state) => {
      state.push(`Mining workers started...\n`);
      return [...state];
    });
    const nonce = await mineHash(target, challenge, fromAddress);
    if (stoping) {
      setEventLog((state) => {
        state.push(`Stop Mine\n`);
        return [...state];
      });
      starting = false;
      stoping = false;
      return;
    }
    setEventLog((state) => {
      state.push(`Successfully discovered a valid nonce:${nonce.toString()}\n`);
      return [...state];
    });
    await new Promise((resolve) => {
      Pow.connect(wallet)
        .mine(nonce, {
          value: ethers.utils.parseEther("0.01"),
          gasLimit: 300000,
        })
        .then(async (res: any) => {
          await res.wait();
          userBalance();
          userLimit();
          setEventLog((state) => {
            state.push(`mine success! nonce=${nonce.toString()}\n`);
            return [...state];
          });
          starting = false;
          if (!stoping) start();
          resolve(null);
        })
        .catch((err: any) => {
          resolve("");
          setEventLog((state) => {
            state.push(err.reason + "\n");
            return [...state];
          });
          retryCount++;
          setEventLog((state) => {
            state.push(
              `Failed to restart, current number of failures: ${retryCount}\n`
            );
            return [...state];
          });
          if (retryCount > 3) {
            setEventLog((state) => {
              state.push(
                `The number of transaction failures exceeds the limit, and the connection is about to be restarted\n`
              );
              return [...state];
            });
            clearInterval(startInterval);
            starting = false;
            getClient(true);
            setTimeout(() => {
              start();
            }, 1000);
          }
        });
    });
  };
  const stop = () => {
    setEventLog((state) => {
      state.push(`Mining workers stoping...\n`);
      return [...state];
    });
    stoping = true;
  };
  const getClient = (isChange = false) => {
    if (isChange) {
      rpc = getGenerator();
      if (!rpc) {
        getGenerator = getNext();
        rpc = getGenerator();
      }
    }
    return new ethers.providers.JsonRpcProvider(rpc);
  };

  const getContract = () => {
    const client = getClient();
    return new ethers.Contract(contract, Abi, client);
  };

  const resetRpc = (e: string) => {
    rpcs.clear();
    rpcs.add(e.trim());
    getGenerator = getNext();
    rpc = getGenerator();
  };

  const reloadRpcs = (_isCustomRpc: boolean) => {
    if (!_isCustomRpc) {
      rpcs.clear();
      rpcs.add("https://binance.llamarpc.com");
      rpcs.add("https://bsc.publicnode.com");
      rpcs.add("https://bsc-dataseed.binance.org");
      getGenerator = getNext();
      rpc = getGenerator();
    } else {
      if (currentRpcRef.current && currentRpcRef.current.value) {
        resetRpc(currentRpcRef.current.value);
      }
    }
  };

  const userBalance = async () => {
    const wallet = new ethers.Wallet(pk, getClient());
    const Pow = getContract();
    const bal = await Pow.balanceOf(wallet.address);
    setBalance(ethers.utils.formatEther(bal));
  };
  const userLimit = async () => {
    const wallet = new ethers.Wallet(pk, getClient());
    const Pow = getContract();
    const limit = await Pow.miningTimes(wallet.address);
    setLimit(10 - limit);
  };
  useEffect(() => {
    if (pk) {
      try {
        const wallet = new ethers.Wallet(pk);
        setAddress(wallet.address);
        userBalance();
        userLimit();
      } catch (err) {
        setAddress("");
      }
    }
  }, [pk]);
  useEffect(() => {
    const el: Element | null = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [eventLog]);
  return (
    <div>
      <div className="text-2xl text-center header-shardow p-4">
        PoWPepe Mint
      </div>

      <main className="relative min-h-screen">
        <img
          src="/assets/logo.png"
          className="absolute bottom-4 right-4 w-56"
          alt=""
        />

        <div className="w-full max-w-screen-md m-auto p-4">
          <div className="join join-vertical gap-4 flex">
            <div className="join-item">
              <div className="form-control">
                <label className="cursor-pointer label justify-start">
                  <input
                    type="checkbox"
                    checked={isCustomRpc}
                    className="checkbox checkbox-warning"
                    onChange={(e) => {
                      setCustomRpc(!isCustomRpc);
                      reloadRpcs(!isCustomRpc);
                    }}
                  />
                  <span className="label-text text-white ml-4 text-lg">
                    Customize Rpc
                  </span>
                </label>
              </div>
              <input
                ref={currentRpcRef}
                type="text"
                placeholder="Enter custom RPC"
                disabled={!isCustomRpc}
                onChange={(e) => resetRpc(e.target.value)}
                style={{ "--fallback-bc": "#0a0a0a40" } as any}
                className="input input-bordered w-full text-black"
              />
            </div>
            <div className="join-item">
              <div className="form-control">
                <label className="cursor-pointer label justify-start">
                  <span className="label-text text-white mr-8 text-lg">
                    Default Rpc
                  </span>
                </label>
              </div>
              <input
                type="text"
                defaultValue="BNB Rpc"
                disabled={isCustomRpc}
                readOnly
                style={{ "--fallback-bc": "#0a0a0a40" } as any}
                className="input input-bordered w-full text-black"
              />
            </div>

            <div className="join-item">
              <div className="form-control">
                <label className="cursor-pointer label justify-start">
                  <span className="label-text text-white mr-8 text-lg">
                    Wallet
                  </span>
                </label>
              </div>
              <input
                type="text"
                placeholder="...."
                value={address}
                disabled
                readOnly
                style={{ "--fallback-bc": "#0a0a0a40" } as any}
                className="input input-bordered w-full text-black"
              />
            </div>

            <div className="join-item">
              <div className="form-control">
                <label className="cursor-pointer label justify-start">
                  <span className="label-text text-white mr-8 text-lg">
                    Private key
                  </span>
                </label>
              </div>
              <input
                type="password"
                placeholder="Fill in the private key of the small wallet"
                value={pk}
                onChange={(e) => setPk(e.target.value)}
                style={{ "--fallback-bc": "#0a0a0a40" } as any}
                className="input input-bordered w-full text-black"
              />
            </div>

            <div className="join-item flex justify-around">
              <div className="btn btn-warning" onClick={start}>
                Start Mine
              </div>
              <div className="btn btn-outline btn-warning" onClick={stop}>
                Stop Script
              </div>
            </div>

            <div className="join-item grid grid-cols-2 grid-gap-4 pt-6 text-lg font-bold">
              <div>Mine Limit</div>
              <div>{limit}</div>

              <div>Balance</div>
              <div>{balance ?? 0} $POPE</div>
            </div>

            <div className="join-item">
              <textarea
                className="textarea textarea-bordered h-48 w-full text-black"
                value={eventLog.toString().replace(/\,/g, "")}
                readOnly
                placeholder="Mint Event..."
                ref={scrollRef}
              ></textarea>
            </div>

            {window?.innerWidth < 600 && <div className="h-48 w-full"></div>}
          </div>
        </div>
      </main>
    </div>
  );
}
