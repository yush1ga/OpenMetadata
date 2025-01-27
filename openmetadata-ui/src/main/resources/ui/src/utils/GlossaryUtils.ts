/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { DefaultOptionType } from 'antd/lib/select';
import { isEmpty } from 'lodash';
import { StatusType } from '../components/common/StatusBadge/StatusBadge.interface';
import { ModifiedGlossaryTerm } from '../components/Glossary/GlossaryTermTab/GlossaryTermTab.interface';
import { FQN_SEPARATOR_CHAR } from '../constants/char.constants';
import { EntityType } from '../enums/entity.enum';
import { Glossary } from '../generated/entity/data/glossary';
import { GlossaryTerm, Status } from '../generated/entity/data/glossaryTerm';
import { EntityReference } from '../generated/type/entityReference';
import { getEntityName } from './EntityUtils';
import Fqn from './Fqn';
import { getGlossaryPath } from './RouterUtils';

export const getEntityReferenceFromGlossary = (
  glossary: Glossary
): EntityReference => {
  return {
    deleted: glossary.deleted,
    href: glossary.href,
    fullyQualifiedName: glossary.fullyQualifiedName ?? '',
    id: glossary.id,
    type: 'glossaryTerm',
    description: glossary.description,
    displayName: glossary.displayName,
    name: glossary.name,
  };
};

export const buildTree = (data: GlossaryTerm[]): GlossaryTerm[] => {
  const nodes: Record<string, GlossaryTerm> = {};

  // Create nodes first
  data.forEach((obj) => {
    nodes[obj.fullyQualifiedName ?? ''] = {
      ...obj,
      children: obj.children?.length ? [] : undefined,
    };
  });

  // Build the tree structure
  const tree: GlossaryTerm[] = [];
  data.forEach((obj) => {
    const current = nodes[obj.fullyQualifiedName ?? ''];
    const parent = nodes[obj.parent?.fullyQualifiedName || ''];

    if (parent && parent.children) {
      // converting glossaryTerm to EntityReference
      parent.children.push({ ...current, type: 'glossaryTerm' });
    } else {
      tree.push(current);
    }
  });

  return tree;
};

export const getQueryFilterToExcludeTerm = (fqn: string) => ({
  query: {
    bool: {
      must: [
        {
          bool: {
            must_not: [
              {
                term: {
                  'tags.tagFQN': fqn,
                },
              },
            ],
          },
        },
        {
          bool: {
            must_not: [
              {
                term: {
                  entityType: EntityType.GLOSSARY_TERM,
                },
              },
              {
                term: {
                  entityType: EntityType.TAG,
                },
              },
              {
                term: {
                  entityType: EntityType.DATA_PRODUCT,
                },
              },
            ],
          },
        },
      ],
    },
  },
});

export const StatusClass = {
  [Status.Approved]: StatusType.Success,
  [Status.Draft]: StatusType.Warning,
  [Status.Rejected]: StatusType.Failure,
  [Status.Deprecated]: StatusType.Warning,
};

export const StatusFilters = Object.values(Status)
  .filter((status) => status !== Status.Deprecated) // Deprecated not in use for this release
  .map((status) => ({
    text: status,
    value: status,
  }));

export const getGlossaryBreadcrumbs = (fqn: string) => {
  const arr = Fqn.split(fqn);
  const dataFQN: Array<string> = [];
  const breadcrumbList = [
    {
      name: 'Glossaries',
      url: getGlossaryPath(''),
      activeTitle: false,
    },
    ...arr.map((d) => {
      dataFQN.push(d);

      return {
        name: d,
        url: getGlossaryPath(dataFQN.join(FQN_SEPARATOR_CHAR)),
        activeTitle: false,
      };
    }),
  ];

  return breadcrumbList;
};

export const findGlossaryTermByFqn = (
  list: ModifiedGlossaryTerm[],
  fullyQualifiedName: string
): GlossaryTerm | Glossary | null => {
  for (const item of list) {
    if (item.fullyQualifiedName === fullyQualifiedName) {
      return item;
    }
    if (item.children) {
      const found = findGlossaryTermByFqn(
        item.children as ModifiedGlossaryTerm[],
        fullyQualifiedName
      );
      if (found) {
        return found;
      }
    }
  }

  return null;
};

export const convertGlossaryTermsToTreeOptions = (
  options: ModifiedGlossaryTerm[] = [],
  level = 0
): Omit<DefaultOptionType, 'label'>[] => {
  const treeData = options.map((option) => {
    const hasChildren = 'children' in option && !isEmpty(option?.children);

    // for 0th level we don't want check option to available
    const isGlossaryTerm = level !== 0;

    // Only include keys with no children or keys that are not expanded
    return {
      id: option.id,
      value: option.fullyQualifiedName,
      title: getEntityName(option),
      'data-testid': `tag-${option.fullyQualifiedName}`,
      checkable: isGlossaryTerm,
      isLeaf: isGlossaryTerm ? !hasChildren : false,
      selectable: isGlossaryTerm,
      children:
        hasChildren &&
        convertGlossaryTermsToTreeOptions(
          option.children as ModifiedGlossaryTerm[],
          level + 1
        ),
    };
  });

  return treeData;
};
