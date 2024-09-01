import 'beautiful-react-diagrams/styles.css';
import React, { useState, useEffect } from 'react';
import Diagram, { useSchema, createSchema } from 'beautiful-react-diagrams';
import mermaid from 'mermaid';


const cleanupText = (code) => {
  return (
    code
      // parser problems on CRLF ignore all CR and leave LF;;
      .replace(/\r\n?/g, '\n')
      // clean up html tags so that all attributes use single quotes, parser throws error on double quotes
      .replace(
        /<(\w+)([^>]*)>/g,
        (match, tag, attributes) => '<' + tag + attributes.replace(/="([^"]*)"/g, "='$1'") + '>'
      )
  );
};

function App() {
  const [spec, setSpec] = useState(null);
  const [diagram, setDiagram] = useState(null);
  const [schema, { onChange, addNode, removeNode, connect }] = useSchema(createSchema({}));

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

    let nodes = []
    let links = []

    const buildGraph = async () => {
      // We always need to call parse before to reset config, mermaid public api is not built to support this use case.
      await mermaid.parse(spec);
      const parser = (
        await mermaid.mermaidAPI.getDiagramFromText(spec)
      ).getParser().yy;
      console.log(parser)

      const vertices = parser.getVertices();
      const edges = parser.getEdges();

      let curX = 250;
      for (const vertex of vertices) {
        const y = vertex[0][0] === '/' ? 120 : 60;
        const x = curX + 50;
        curX += 50; 
        addNode({ id: vertex[0], content: vertex[0], coordinates: [x, y], })
      }
      for (const link of edges) {
        connect(link.start, link.end)
      }

      //useSchema(createSchema({nodes: nodes, links: links}))
    }
    
    buildGraph()
  }, [spec]);

  return (
    <div className="App">
      <h1>fences</h1>
      <div style={{ height: '22.5rem' }}>
        <Diagram schema={schema} onChange={onChange} />
      </div>
    </div>
  );
}

export default App;
