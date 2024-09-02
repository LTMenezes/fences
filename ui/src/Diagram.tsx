import React, { FC } from 'react';
import { Group } from '@visx/group';
import { hierarchy, Tree } from '@visx/hierarchy';
import { LinearGradient } from '@visx/gradient';
import useForceUpdate from './useForceUpdate';
import { LinkHorizontalStep } from '@visx/shape';

interface Margin {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface NodeData {
  name: string;
  isExpanded: boolean;
  children?: NodeData[];
}

interface DiagramProps {
  width: number;
  height: number;
  margin?: Margin;
  data: NodeData;
}

const defaultMargin: Margin = { top: 30, left: 200, right: 200, bottom: 70 };

export const Diagram: FC<DiagramProps> = ({
  width: totalWidth,
  height: totalHeight,
  margin = defaultMargin,
  data,
}) => {
  const forceUpdate = useForceUpdate();

  const innerWidth: number = totalWidth - margin.left - margin.right;
  const innerHeight: number = totalHeight - margin.top - margin.bottom;

  let origin = { x: 0, y: 0 };

  const LinkComponent = LinkHorizontalStep;

  return totalWidth < 10 ? null : (
    <div>
      <svg width={totalWidth} height={totalHeight}>
        <LinearGradient id="links-gradient" from="#fd9b93" to="#fe6e9e" />
        <Group top={margin.top} left={margin.left}>
          <Tree
            root={hierarchy(data, (d) => (d.isExpanded ? null : d.children))}
            size={[innerHeight, innerWidth]}
            separation={(a, b) => (a.parent === b.parent ? 1.5 : 2) / a.depth}
          >
            {(tree) => (
              <Group top={origin.y} left={origin.x}>
                {tree.links().map((link, i) => (
                  <LinkComponent
                    key={i}
                    data={link}
                    percent={0.5}
                    stroke="rgb(254,110,158,0.6)"
                    strokeWidth={5}
                    fill="none"
                  />
                ))}

                {tree.descendants().map((node, key) => {
                  const width: number = 240;
                  const height: number = 40;

                  let top: number = node.x;
                  let left: number = node.y;

                  return (
                    <Group top={top} left={left} key={key}>
                      {node.depth === 0 && (
                        <circle
                          r={30}
                          fill="url('#links-gradient')"
                          onClick={() => {
                            node.data.isExpanded = !node.data.isExpanded;
                            console.log(node);
                            forceUpdate();
                          }}
                        />
                      )}
                      {node.depth !== 0 && (
                        <rect
                          height={height}
                          width={width}
                          y={-height / 2}
                          x={-width / 2}
                          fill="#272b4d"
                          stroke={node.data.children ? '#03c0dc' : '#26deb0'}
                          strokeWidth={1}
                          strokeDasharray={node.data.children ? '0' : '2,2'}
                          strokeOpacity={node.data.children ? 1 : 0.6}
                          rx={node.data.children ? 0 : 10}
                          onClick={() => {
                            node.data.isExpanded = !node.data.isExpanded;
                            console.log(node);
                            forceUpdate();
                          }}
                        />
                      )}
                      <text
                        dy=".33em"
                        fontSize={20}
                        fontFamily="Arial"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                        fill={node.depth === 0 ? '#71248e' : node.children ? 'white' : '#26deb0'}
                      >
                        {node.data.name}
                      </text>
                    </Group>
                  );
                })}
              </Group>
            )}
          </Tree>
        </Group>
      </svg>
    </div>
  );
}
