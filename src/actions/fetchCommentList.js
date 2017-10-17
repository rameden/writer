import axios from 'axios';
import config from '../config';

export const REQUEST_COMMENTS_LIST = 'REQUEST_COMMENTS_LIST';
export const RECEIVE_COMMENTS_LIST = 'RECEIVE_COMMENTS_LIST';

const requestCommentsList = (postID) => {
    return {
        type: REQUEST_COMMENTS_LIST,
        postID: postID
    }
};

const receiveCommentsList = (commentsObj, postID, CommentsAmount, supDict) => {
    return {
        type: RECEIVE_COMMENTS_LIST,
        data: commentsObj,
        postID: postID,
        CommentsAmount: CommentsAmount,
        supDict: supDict
    }
};


export const fetchCommentList = (postID, page = 1) => {
    let url = config.prefix + 'comments?order=asc&post=' + postID + '&page=' + page;
    return (dispatch, getState) => {
        dispatch(requestCommentsList(postID));
        axios.get(url)
            .then((response) => {

            })
            .then((response) => {
                const commentList = response.data;
                let commentObj = changeListToObj(commentList);

                let queryIDs = {};
                let queryPromises = [];
                commentList.map(comment => {
                    if (comment.parent !== 0 && !commentObj[comment.parent]) {
                        queryIDs[comment.parent] = 0;
                    }
                });
                Object.keys(queryIDs).map(id => {
                    queryPromises.push(getCommentUser(id))
                });

                Promise.all(queryPromises).then(resList => {
                    let supDict = {};
                    resList.map(res => {
                        supDict[res.data.id] = res.data;
                    });

                    dispatch(receiveCommentsList(commentList, postID, parseInt(response.headers['x-wp-total'], 10), supDict));
                });

            })
    }
};

const getCommentUser = (id) => {
    const url = config.prefix + 'comments/' + id;
    return axios.get(url);
};

// Change comment list to comment object.
const changeListToObj = (commentList) => {
    let commentObj = {0: null};
    commentList.map(comment => {
        commentObj[comment.id] = comment;
    });
    return commentObj;
};

// Reorder the comment list by thread
const reorderComment = (comments) => {
    class Node {
        constructor(value, parent = 0) {
            this.prev = parent;
            this.value = value;
            this.children = [];
        }
    }

    const buildCommentTree = () => {
        let dict = {};      // Map id to node
        let root = [];      // The array of root id
        let commentDict = {};

        for (let i = 0; i < comments.length; i++) {
            const id = parseInt(comments[i].comment_ID);
            const parentID = parseInt(comments[i].comment_parent);

            commentDict[id] = comments[i];

            // Get the node and set its parent
            let node = null;
            if (dict[id]) {                         // If this node can be found in the dict, pick out and set its parent
                node = dict[id];
                node.prev = parentID;
            } else {                                // Else, create a new one
                node = new Node(id, parentID);
                dict[id] = node;
            }

            // Set parent node's children
            if (parentID !== 0) {
                let parentNode = null;
                if (dict[parentID]) {
                    parentNode = dict[parentID];
                } else {
                    parentNode = new Node(id);
                    dict[parentID] = parentNode;
                }
                parentNode.children.push(id)
            } else {
                root.push(id);
            }
        }
        return {dict, root, commentDict};
    };

    // TODO: Not finished
    const generateCommentsList = (dict, root, commentDict) => {
        let out = [];

        for (let i = 0; i < root.length; i++) {
            out.push(commentDict[root[i]]);
            const children = dict[root[i]].children;
            if (children.length !== 0) {
                for (let k = 0; k < children.length; k++) {
                    out.concat(generateCommentsList(dict, children))
                }
            }
        }
    }
};