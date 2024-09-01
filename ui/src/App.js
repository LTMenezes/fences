import './App.css'
import React, { useState, useEffect, Children } from 'react';
import { useSchema, createSchema } from 'beautiful-react-diagrams';
import mermaid from 'mermaid';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import {Diagram} from './Diagram.js';


var traverseTree = function(node, targetName) {
  if(node !== undefined && node.name === targetName){
    return node;
  }

  for (var cki in node.children) {
      const res = traverseTree(node.children[cki], targetName);
      if (res)
        return res
  }
}

function App() {
  const [spec, setSpec] = useState(null);
  const [tree, setTree] = useState({});


  useEffect(() => {
    console.log('fetching spec');
    fetch('http://localhost:5000/graph')
      .then(response => response.text())
      .then(text => {
        console.log('received spec', text)
        setSpec(text)
      })
      .catch(error => console.error(error));
  }, []);

  useEffect(() => {
    if(spec == null)
      return;


    let tempTree = {name: 'root', children: []}

    const buildGraph = async () => {
      // We always need to call parse before to reset config, mermaid public api is not built to support this use case.
      await mermaid.parse(spec);
      const parser = (
        await mermaid.mermaidAPI.getDiagramFromText(spec)
      ).getParser().yy;
      console.log(parser)

      const vertices = parser.getVertices();
      const edges = parser.getEdges();

      for (const link of edges) {
        console.log('comecando busca ', tempTree, link.start)
        const parent = traverseTree(tempTree, link.start)
        if(parent !== undefined) {
          console.log('encontrei')
          parent.children.push({name: link.end, children: []})
        } else {
          tempTree.children.push({
            name: link.start,
            children: [
              {
                name: link.end,
                children: [],
              }
            ]
          })
        }
      }
      setTree(tempTree)
      //useSchema(createSchema({nodes: nodes, links: links}))
    }
    
    buildGraph()
  }, [spec]);

  return (
    <div className="App" style={{ height: "80vh" }}>
      <h1>fences</h1>
      <ParentSize>{({ width, height }) => <Diagram width={width} height={height} data={tree} />}</ParentSize>
    </div>
  );
}

export default App;
