import './App.css';
import React, { useState, useEffect, FC, useRef } from 'react';
import mermaid from 'mermaid';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { Diagram } from './Diagram.tsx';
import { Textarea } from "./components/ui/textarea"
import { Label } from "./components/ui/label"
import { LoadingSpinner } from "./components/ui/loading-spinner.tsx"
import TimeAgo from 'react-timeago'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./components/ui/context-menu"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select.tsx"
import { FrameIcon, HamburgerMenuIcon, MagicWandIcon, CopyIcon, TrashIcon } from "@radix-ui/react-icons"
import {CopyToClipboard} from 'react-copy-to-clipboard';
import { Button } from "./components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "./components/ui/sheet"
import { Badge } from "./components/ui/badge"
import { useStatePersist } from 'use-state-persist';
import { v4 as uuid } from 'uuid'

interface TreeNode {
  name: string;
  children: TreeNode[];
  isExpanded: boolean;
}

interface CachedRequest {
  request: any;
  response: any;
  timestamp: number;
  id: string;
}

const traverseTree = (node: TreeNode, targetName: string): TreeNode | undefined => {
  if (node !== undefined && node.name === targetName) {
    return node;
  }

  for (const cki of node.children) {
    const res = traverseTree(cki, targetName);
    if (res) return res;
  }
  return undefined;
};

function findMatchingSpec(spec: any, endpointName: string): any {
  var reversedEndpointName = '';
  var open = false;
  for (let i = 0; i < endpointName.length -1; ++i) {
    if (endpointName[i] === '\'') {
      reversedEndpointName += open ? '}' : '{';
      open = !open;
      continue;
    }
    reversedEndpointName += endpointName[i];
  }
  
  var res = undefined;
  Object.keys(spec['spec']['paths']).forEach((path: any) => {
    if (path === reversedEndpointName) {
      console.log('found', spec['spec']['paths'][path]);
      res = [spec['spec']['paths'][path], path];
    }
  });

  return res;
}

function parseSpec(spec: any): any {
  var supportedVerbs = Object.keys(spec[0]);

  return {
    'spec': spec[0],
    'verbs': supportedVerbs,
    'path': spec[1],
  }
}


const App: FC = () => {
  const [spec, setSpec] = useState<string | null>(null);
  const [info, setInfo] = useState<any | null>(null);
  const [tree, setTree] = useState<TreeNode>({ name: 'root', children: [], isExpanded: false });
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedEndpointSpec, setSelectedEndpointSpec] = useState<any | null>(null);
  const [selectedHTTPVerb, setSelectHTTPVerb] = useState<string | undefined>(undefined);
  const [AIGeneratedBody, setAIGeneratedBody] = useState<string | null>(null);
  const [requestBody, setRequestBody] = useState<string>("");
  const [responseBody, setResponseBody] = useState<any | undefined>(undefined);
  const [isAIBodyLoading, setIsAIBodyLoading] = useState<boolean>(false);
  const [isRequestInTransit, setIsRequestInTransit] = useState<boolean>(false);
  const requestBodyTextArea = useRef<HTMLTextAreaElement>(null);
  const responseBodyTextArea = useRef<HTMLTextAreaElement>(null);
  const [cacheData, setCachedData] = useStatePersist<CachedRequest[]>("@cachedData", [])

  useEffect(() => {
    if (requestBodyTextArea.current) {
      requestBodyTextArea.current.style.height = 'auto';
      requestBodyTextArea.current.style.height = `${requestBodyTextArea.current.scrollHeight}px`;
    }
  }, [requestBody]);

  useEffect(() => {
    if (responseBodyTextArea.current) {
      responseBodyTextArea.current.style.height = 'auto';
      responseBodyTextArea.current.style.height = `${responseBodyTextArea.current.scrollHeight}px`;
    }
  }, [responseBody]);

  function sendRequest() {
    setIsRequestInTransit(true);
    const request_data = {path:  selectedEndpoint, method: selectedHTTPVerb, body: requestBody}
    fetch('http://localhost:5000/send-request', {
      method: "POST",
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body:  JSON.stringify(request_data)
      })
    .then((response) => response.json())
    .then((json) => {
      setResponseBody(JSON.stringify(json, null, "\t"));
      const updatedCacheData = cacheData;
      updatedCacheData.push({'request': request_data, 'response': json, 'timestamp': Date.now(), 'id': uuid()})
      setCachedData(updatedCacheData)
    })
    .catch((error) => {
      console.error(error)
    })
    .finally(() => {
      setIsRequestInTransit(false)
    });
  }

  function requestAIBody() {
    setIsAIBodyLoading(true)
    fetch('http://localhost:5000/generate-request-body', {
      method: "POST",
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body:  JSON.stringify({path:  selectedEndpoint, method: selectedHTTPVerb})
      })
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
      setAIGeneratedBody(json['suggest_body']);
    })
    .catch((error) => {
      console.error(error)
    })
    .finally(() => {
      setIsAIBodyLoading(false)
    });
  }

  function removeCachedItem(id: string) {
    const updatedCacheData = cacheData.filter(item => item.id !== id);
    setCachedData(updatedCacheData);
  }

  useEffect(() => {
    fetch('http://localhost:5000/info')
      .then((response) => response.json())
      .then((json) => {
        setSpec(json['diagram']);
        setInfo(json)
      })
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => { 
    if(selectedEndpoint===null) return;

    // Clean up
    setRequestBody("");
    setAIGeneratedBody(null);
    setResponseBody(undefined)

    var temp = findMatchingSpec(info, selectedEndpoint);
    const parsedSpec = parseSpec(temp);
    setSelectedEndpointSpec(parsedSpec);
    setSelectHTTPVerb(parsedSpec['verbs'][0])
  }, [selectedEndpoint, info]);

  useEffect(() => { 
    if(AIGeneratedBody===null) return;
    setRequestBody(JSON.stringify(JSON.parse(AIGeneratedBody), null, "\t"))
  }, [AIGeneratedBody]);

  useEffect(() => {
    if (spec == null) return;

    let tempTree: TreeNode = { name: 'root', children: [], isExpanded: false };

    const buildGraph = async () => {
      await mermaid.parse(spec);
      const parser: any = (await mermaid.mermaidAPI.getDiagramFromText(spec)).getParser()
      const parser_yy = parser.yy;
      console.log(parser_yy);

      //const vertices = parser_yy.getVertices();
      const edges = parser_yy.getEdges();

      for (const link of edges) {
        const parent = traverseTree(tempTree, link.start);
        if (parent !== undefined) {
          parent.children.push({ name: link.end, children: [], isExpanded: false });
        } else {
          tempTree.children.push({
            name: link.start,
            children: [
              {
                name: link.end,
                children: [],
                isExpanded: false,
              },
            ],
            isExpanded: false
          });
        }
      }
      setTree(tempTree);
    };

    buildGraph();
  }, [spec]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <>
              <FrameIcon className="h-6 w-6" />
              <span className="sr-only">Fences</span>
            </>
            <>
              {info ? info['title'] : 'Loading...'}
            </>
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <HamburgerMenuIcon className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <>
                <HamburgerMenuIcon className="h-6 w-6" />
                <span className="sr-only">Fences</span>
              </>
              <>
                {info ? info['title'] : 'Loading...'}
              </>
            </nav>
          </SheetContent>
        </Sheet>
      </header>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto grid w-full max-w-5xl items-start gap-6 md:grid-cols-[1fr_1fr_1fr] justify-center">
          <div className="flex gap-2 justify-center">
            <div className='flex-1'>
              <Card
              className="xl:col-span-2" x-chunk="dashboard-01-chunk-4"
              >
                <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                    <CardTitle>Endpoints Diagram</CardTitle>
                    <CardDescription>
                      AI Generated visual representation on the endpoints.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* todo: fix this parentsize */}
                  <ParentSize>{({ width, height }) => <Diagram width={1000} height={1000} data={tree} setSelectedEndpoint={setSelectedEndpoint}/>}</ParentSize>
                </CardContent>
              </Card>
            </div>
            <div className='flex-1 min-w-[300px]'>
              <Card
              className="xl:col-span-2" x-chunk="dashboard-01-chunk-4"
              >
                <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                    <CardTitle>Current Request</CardTitle>
                    <CardDescription>
                      Select an endpoint on the diagram to start a request.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {
                      (selectedEndpoint && selectedEndpointSpec)?
                      <>
                      <Badge>{selectedEndpointSpec['path']}</Badge>
                      <Select onValueChange={(value)=> setSelectHTTPVerb(value)} value={selectedHTTPVerb}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an http verb" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedEndpointSpec['verbs'].map((el: string) => <SelectItem key={el} value={el}>{el.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {selectedHTTPVerb?.toUpperCase() !== "GET" && <>
                        <p className="font-medium">Request Body</p>

                        {isAIBodyLoading ? 
                          <div className="flex justify-center items-center h-[200px]">
                            <LoadingSpinner />
                          </div>
                        : 
                          <Textarea 
                            value={requestBody} 
                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                              setRequestBody(event.target.value);
                              event.target.style.height = 'auto';
                              event.target.style.height = `${event.target.scrollHeight}px`;
                            }}
                            className="min-h-[100px] overflow-hidden"
                            style={{ resize: 'none' }}
                            ref={requestBodyTextArea}
                          />
                        }
                        <Button onClick={() => requestAIBody()}>AI-Generate Body <MagicWandIcon /></Button>
                        </>
                      }
                                            
                      <Button onClick={() => sendRequest()}>Send Request</Button>
                      </> :
                      <Label>Click an endpoint to select it.</Label>
                    }
                    {isRequestInTransit &&
                      <div className="flex justify-center items-center h-[200px]">
                        <LoadingSpinner />
                      </div>
                    }

                    {(responseBody && !isRequestInTransit) &&
                      <>
                        <CardTitle>Response:</CardTitle>
                        <Textarea 
                            value={responseBody} 
                            className="min-h-[100px] max-h-[500px]"
                            style={{ resize: 'none' }}
                            ref={responseBodyTextArea}
                          />
                      </>
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className='flex-1'>
              <Card
              className="xl:col-span-2" x-chunk="dashboard-01-chunk-4"
              >
                <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                    <CardTitle>Data collected</CardTitle>
                    <CardDescription>
                      These are the data we collected from requests/responses you made. AI might use them to help you make future requests.
                      Right-click to interact with them.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {cacheData.length !== 0 ? <>
                    {
                      cacheData.map((value) => {
                        return <ContextMenu>
                        <ContextMenuTrigger>
                          <Card className="mb-2 min-w-[200px] min-h-[40px] flex flex-col justify-center">
                            <CardTitle className="flex justify-between items-center">
                              <span>{value.request.path}</span>
                              <span className="text-sm text-muted-foreground"> <TimeAgo date={value.timestamp} /></span>
                            </CardTitle>
                          </Card>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <CopyToClipboard text={JSON.stringify(value)}>
                            <ContextMenuItem> <CopyIcon/>Copy data</ContextMenuItem>
                          </CopyToClipboard>
                          <ContextMenuItem onClick={() => removeCachedItem(value.id)}> <TrashIcon/>Delete</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      })
                    }</>:
                    <Label>No data collected yet.</Label>
                  }
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
