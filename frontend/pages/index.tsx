/**
 * Root entrypoint that keeps browser navigation anchored to the home route.
 */
import type { GetServerSideProps } from "next";

export default function IndexPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/home",
      permanent: false
    }
  };
};
