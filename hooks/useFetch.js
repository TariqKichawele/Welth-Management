import { useState } from "react";
import { toast } from "sonner";

const useFetch = (cb) => {
    const [ data, setData ] = useState(null);
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState(null);

    const fn = async (...args) => {
        setLoading(true);
        setError(null);

        try {
            const res = await cb(...args);
            setData(res);
            setError(null);
        } catch (error) {
            setError(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, fn, setData };
};

export default useFetch;