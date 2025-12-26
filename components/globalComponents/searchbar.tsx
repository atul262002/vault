"use client"
import React, { ChangeEventHandler,  useEffect, useState } from 'react'
import { Input } from '../ui/input'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import queryString from 'query-string'


const SearchBar = () => {
    const router = useRouter()
    const params = useSearchParams()

    const productId = params.get("productId")

    const [value, setValue] = useState(productId || "")
    const debouncedValue = useDebounce<string>(value, 500)

    const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        setValue(e.target.value)
    }

    useEffect(() => {
        const query = { productId: debouncedValue }
        const url = queryString.stringifyUrl({
            url: window.location.href,
            query
        }, { skipEmptyString: true, skipNull: true })
        router.push(url)
    }, [debouncedValue, router, productId])

    return (
            <div className='relative'>
                <Search className='absolute h-4 w-4 left-4 text-muted-foreground top-3' />
                <Input
                    placeholder='Search product by id'
                    className='pl-10 bg-primary/10'
                    onChange={onChange}
                    value={value}
                />
            </div>

    )
}

export default SearchBar