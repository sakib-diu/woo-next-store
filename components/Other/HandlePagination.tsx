'use client'

import React from 'react';
import ReactPaginate from 'react-paginate';

interface Props {
    pageCount: number
    currentPage?: number
    onPageChange: (selected: number) => void;
}

const HandlePagination: React.FC<Props> = ({ pageCount, currentPage, onPageChange }) => {
    return (
        <ReactPaginate
            previousLabel="<"
            nextLabel=">"
            pageCount={pageCount}
            forcePage={currentPage}
            pageRangeDisplayed={3}
            marginPagesDisplayed={2}
            onPageChange={(selectedItem) => onPageChange(selectedItem.selected)}
            containerClassName={'pagination'}
            activeClassName={'active'}
        />
    );
};

export default HandlePagination;
