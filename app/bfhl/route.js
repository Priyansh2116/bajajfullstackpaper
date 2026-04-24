import { NextResponse } from 'next/server';
//My submitter identity
const SUBMITTER_IDENTITY = {
  user_id: 'priyanshsonthalia_13032005',
  email_id: 'ps9746@srmist.edu.in',
  college_roll_number: 'RA2311003010244',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
//Api endpoint
export async function POST(request) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Expected { data: string[] }' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
//returning raw response
    const result = analyzeNodeList(data);
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Malformed request body' },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}
//analyse and fiter node list
function analyzeNodeList(rawEntries) {
  const { validEdges, invalidEntries } = classifyEntries(rawEntries);
  const { uniqueEdges, duplicateEdges } = deduplicateEdges(validEdges);
  const graph = buildDirectedGraph(uniqueEdges);
  const hierarchies = extractHierarchies(graph);
  const summary = computeSummary(hierarchies);

  return {
    ...SUBMITTER_IDENTITY,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  };
}
//single letter to letter inputs only
const EDGE_FORMAT = /^[A-Z]->[A-Z]$/;

function classifyEntries(rawEntries) {
  const validEdges = [];
  const invalidEntries = [];

  for (const raw of rawEntries) {
    if (typeof raw !== 'string') {
      invalidEntries.push(String(raw));
      continue;
    }

    const entry = raw.trim();
    const matchesPattern = EDGE_FORMAT.test(entry);
    const isSelfLoop = entry[0] === entry[3];

    if (!matchesPattern || isSelfLoop) {
      invalidEntries.push(entry);
    } else {
      validEdges.push(entry);
    }
  }

  return { validEdges, invalidEntries };
}

function deduplicateEdges(edges) {
  const seen = new Set();
  const duplicatesSet = new Set();
  const uniqueEdges = [];
  const duplicateEdges = [];

  for (const edge of edges) {
    if (!seen.has(edge)) {
      seen.add(edge);
      uniqueEdges.push(edge);
    } else if (!duplicatesSet.has(edge)) {
      duplicatesSet.add(edge);
      duplicateEdges.push(edge);
    }
  }

  return { uniqueEdges, duplicateEdges };
}

function buildDirectedGraph(edges) {
  const adjList = new Map();
  const parents = new Map();
  const allNodes = new Set();

  for (const edge of edges) {
    const [parentNode, childNode] = edge.split('->');
//verify if the node already has a parent
    const hasParent = parents.has(childNode);
    if (hasParent) continue;

    parents.set(childNode, parentNode);

    if (!adjList.has(parentNode)) {
      adjList.set(parentNode, []);
    }
    adjList.get(parentNode).push(childNode);

    allNodes.add(parentNode);
    allNodes.add(childNode);
  }

  return { adjList, parents, allNodes };
}

function extractHierarchies(graph) {
  const { adjList, parents, allNodes } = graph;
  const componentGroups = groupIntoComponents(allNodes, parents);

  return componentGroups.map(nodes =>
    describeComponent(nodes, adjList, parents)
  );
}

function groupIntoComponents(allNodes, parents) {
  const rep = {};
  for (const node of allNodes) rep[node] = node;

  function find(node) {
    if (rep[node] !== node) {
      rep[node] = find(rep[node]);
    }
    return rep[node];
  }

  function merge(nodeA, nodeB) {
    rep[find(nodeA)] = find(nodeB);
  }

  for (const [child, parent] of parents) {
    merge(child, parent);
  }

  const buckets = new Map();
  for (const node of allNodes) {
    const rootRep = find(node);
    if (!buckets.has(rootRep)) buckets.set(rootRep, []);
    buckets.get(rootRep).push(node);
  }

  return [...buckets.values()];
}

function describeComponent(nodes, adjList, parents) {
  const noParents = nodes.filter(node => !parents.has(node));

  if (noParents.length === 0) {
    const firstNode = [...nodes].sort()[0];
    return { root: firstNode, tree: {}, has_cycle: true };
  }

  const rootNode = noParents[0];
  //to verify there are no internal loops
  const hasCycle = detectCycleFromRoot(rootNode, adjList);

  if (hasCycle) {
    return { root: rootNode, tree: {}, has_cycle: true };
  }

  const nestedTreeStructure = { [rootNode]: buildNestedTree(rootNode, adjList) };
  const treeDepth = getTreeDepth(rootNode, adjList);

  return { root: rootNode, tree: nestedTreeStructure, depth: treeDepth };
}
//construct nested object representing the tree
function buildNestedTree(node, adjList) {
  const children = adjList.get(node) ?? [];
  const subtree = {};

  for (const child of children) {
    subtree[child] = buildNestedTree(child, adjList);
  }

  return subtree;
}
//calc tree depth recursively
function getTreeDepth(node, adjList) {
  const children = adjList.get(node) ?? [];

  if (children.length === 0) return 1;

  const maxChildDepth = Math.max(
    ...children.map(child => getTreeDepth(child, adjList))
  );

  return 1 + maxChildDepth;
}
//use dfs
function detectCycleFromRoot(startNode, adjList) {
  const fullyExplored = new Set();
  const currentPath = new Set();

  function dfs(node) {
    fullyExplored.add(node);
    currentPath.add(node);

    for (const neighbor of (adjList.get(node) ?? [])) {
      if (!fullyExplored.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (currentPath.has(neighbor)) {
        return true;
      }
    }

    currentPath.delete(node);
    return false;
  }

  return dfs(startNode);
}
// Find tree with the max depth 
function computeSummary(hierarchies) {
  const validTrees = hierarchies.filter(h => !h.has_cycle);
  const cyclicGroups = hierarchies.filter(h => h.has_cycle);

  const deepestTree = validTrees.reduce((best, current) => {
    if (!best) return current;

    const isDeeper = current.depth > best.depth;
    const isTied = current.depth === best.depth;
    const comesFirst = current.root < best.root;

    if (isDeeper || (isTied && comesFirst)) {
      return current;
    }
    return best;
  }, null);

  return {
    total_trees: validTrees.length,
    total_cycles: cyclicGroups.length,
    largest_tree_root: deepestTree?.root ?? null,
  };
}