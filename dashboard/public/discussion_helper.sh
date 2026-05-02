#!/bin/bash

# Multi-Agent Task Hub - Discussion Helper (GraphQL Edition)

# 获取 Repository ID
get_repo_id() {
  gh api graphql -f query='
    query($owner:String!, $name:String!) {
      repository(owner:$owner, name:$name) {
        id
      }
    }' -F owner="$1" -F name="$2" --jq '.data.repository.id'
}

# 获取所有 Category 并匹配
get_category_id() {
  gh api graphql -f query='
    query($owner:String!, $name:String!) {
      repository(owner:$owner, name:$name) {
        discussionCategories(first:10) {
          nodes {
            id
            name
          }
        }
      }
    }' -F owner="$1" -F name="$2" --jq ".data.repository.discussionCategories.nodes[] | select(.name == \"$3\") | .id"
}

# 创建 Discussion
create_discussion() {
  REPO_ID=$1
  CATEGORY_ID=$2
  TITLE=$3
  BODY=$4
  
  gh api graphql -f query='
    mutation($repoId:ID!, $categoryId:ID!, $title:String!, $body:String!) {
      createDiscussion(input: {repositoryId:$repoId, categoryId:$categoryId, title:$title, body:$body}) {
        discussion {
          url
        }
      }
    }' -F repoId="$REPO_ID" -F categoryId="$CATEGORY_ID" -F title="$TITLE" -F body="$BODY"
}

# 搜索相关的 Discussion (参考 openclaw-qa 的知识检索逻辑)
search_discussions() {
  QUERY=$1
  gh api graphql -f query='
    query($owner:String!, $name:String!, $query:String!) {
      repository(owner:$owner, name:$name) {
        discussions(first:5, text:$query) {
          nodes {
            title
            url
            body
          }
        }
      }
    }' -F owner="$2" -F name="$3" -F query="$QUERY"
}

case "$1" in
  "post")
    OWNER=$(echo $GITHUB_REPOSITORY | cut -d'/' -f1)
    REPO_NAME=$(echo $GITHUB_REPOSITORY | cut -d'/' -f2)
    REPO_ID=$(get_repo_id "$OWNER" "$REPO_NAME")
    
    # 尝试匹配。如果找不到指定的分类，退而求其次使用 Q&A 或 General
    CAT_ID=$(get_category_id "$OWNER" "$REPO_NAME" "$2")
    if [ -z "$CAT_ID" ]; then
      echo "Category '$2' not found. Falling back to 'Q&A' or 'General'..."
      CAT_ID=$(get_category_id "$OWNER" "$REPO_NAME" "Q&A")
      [ -z "$CAT_ID" ] && CAT_ID=$(get_category_id "$OWNER" "$REPO_NAME" "General")
    fi
    
    create_discussion "$REPO_ID" "$CAT_ID" "$3" "$4"
    ;;
  "search")
    OWNER=$(echo $GITHUB_REPOSITORY | cut -d'/' -f1)
    REPO_NAME=$(echo $GITHUB_REPOSITORY | cut -d'/' -f2)
    search_discussions "$2" "$OWNER" "$REPO_NAME"
    ;;
esac
