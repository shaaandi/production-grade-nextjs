import React, { FC } from 'react'
import path from 'path'
import fs from 'fs'
import hydrate from 'next-mdx-remote/hydrate'
import stringifyMdx from 'next-mdx-remote/render-to-string'
import matter from 'gray-matter'
import { majorScale, Pane, Heading, Spinner } from 'evergreen-ui'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Post } from '../../types'
import Container from '../../components/container'
import HomeNav from '../../components/homeNav'
import { posts } from '../../content'

const BlogPost: FC<Post> = ({ source, frontMatter }) => {
  const content = hydrate(source)
  const router = useRouter()

  if (router.isFallback) {
    return (
      <Pane width="100%" height="100%">
        <Spinner size={48} />
      </Pane>
    )
  }
  return (
    <Pane>
      <Head>
        <title>{`Known Blog | ${frontMatter.title}`}</title>
        <meta name="description" content={frontMatter.summary} />
      </Head>
      <header>
        <HomeNav />
      </header>
      <main>
        <Container>
          <Heading fontSize="clamp(2rem, 8vw, 6rem)" lineHeight="clamp(2rem, 8vw, 6rem)" marginY={majorScale(3)}>
            {frontMatter.title}
          </Heading>
          <Pane>{content}</Pane>
        </Container>
      </main>
    </Pane>
  )
}

BlogPost.defaultProps = {
  source: '',
  frontMatter: { title: 'default title', summary: 'summary', publishedOn: '' },
}

/**
 * Need to get the paths here
 * then the the correct post for the matching path
 * Posts can come from the fs or our CMS
 */

export function getStaticPaths() {
  // return all the paths of the blogs;
  const fileSysBlogsPath = path.join(process.cwd(), 'posts')
  const fileSysBlogsDir = fs.readdirSync(fileSysBlogsPath)
  const slugs = fileSysBlogsDir.map((filename) => {
    const filePath = path.join(fileSysBlogsPath, filename)
    const file = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(file)
    return data
  })

  return {
    fallback: true,
    paths: slugs.map((s) => ({ params: { slug: s.slug } })),
  }
}

export async function getStaticProps({ params }) {
  const { slug } = params
  let post
  try {
    const filePath = path.join(process.cwd(), 'posts', `${slug}.mdx`)
    console.log(filePath)
    const file = fs.readFileSync(filePath, 'utf-8')
    post = matter(file)
  } catch {
    // the post is not found in the file system then see in the CMS;
    const match = posts.published.map((p) => matter(p)).find(({ data }) => data.slug === slug)
    post = match
  }

  const content = await stringifyMdx(post.content)

  return {
    props: {
      frontMatter: post.data,
      source: content,
    },
  }
}

export default BlogPost
