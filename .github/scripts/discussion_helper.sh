#!/bin/bash

# 获取 Repository ID
get_repo_id() {
  gh api graphql -f query='
    query($owner:String!, $name:String!) {
      repository(owner:$owner, name:$name) {
        id
      }
    }' -F owner="$1" -F name="$2" --jq '.data.repository.id'
}

# 获取 Category ID
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

case "$1" in
  "post")
    OWNER=$(echo $GITHUB_REPOSITORY | cut -d'/' -f1)
    REPO_NAME=$(echo $GITHUB_REPOSITORY | cut -d'/' -f2)
    REPO_ID=$(get_repo_id "$OWNER" "$REPO_NAME")
    CAT_ID=$(get_category_id "$OWNER" "$REPO_NAME" "$2")
    
    if [ -z "$CAT_ID" ]; then
      echo "Category $2 not found, using first available category."
      CAT_ID=$(gh api graphql -f query='query($owner:String!, $name:String!) { repository(owner:$owner, name:$name) { discussionCategories(first:1) { nodes { id } } } }' -F owner="$OWNER" -F name="$REPO_NAME" --jq '.data.repository.discussionCategories.nodes[0].id')
    fi
    
    create_discussion "$REPO_ID" "$CAT_ID" "$3" "$4"
    ;;
esac
