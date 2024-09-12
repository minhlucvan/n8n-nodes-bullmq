
![Banner image](./bullmq-banner.png)

# n8n-nodes-bullmq

This package provides nodes to interact with [BullMQ](https://docs.bullmq.io/) in n8n.

## Installation

There are two ways to install community nodes:

- Within n8n using the GUI, [find more information here](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/)


- Manually from the command line: use this method if your n8n instance doesn't support installation through 
 [The n8n CLI](https://docs.n8n.io/integrations/community-nodes/installation/manual-install/)


## BullMQ 

BullMQ is a Node.js queue library that is built on top of Redis. It is a rewrite of the original Bull Library, which is no longer maintained. BullMQ is a simple, fast, and reliable queue library suitable for a wide range of use cases.

While working with **N8N** I found that we need some way to to queue the jobs and work on them asynchronously. Since **Redis** and **BullMQ** are the most lightweight and reliable solutions for this, I decided to create a set of nodes to work with **BullMQ**.

## Features

Trying to cover all functionalities that [BullMQ provides](https://docs.bullmq.io/patterns/adding-bulks)

- [x] **Queueing Jobs**: Queue jobs to be processed asynchronously without blocking the main thread.
  
- [x] **Workflow Monitoring**: Monitor the progress of jobs in the workflow using BullMQ and tools like bullmq-board.

- [x] **Rate Limiting**: Rate-limit the number of jobs processed simultaneously to avoid overloading the system.

- [x] **Job Retries**: Automatically retry jobs that fail, until they succeed.

- [x] **Flow Control**: Control the flow of jobs in a workflow, ensuring specific job processing order, or pausing/resuming jobs.

- [x] **Job Prioritization**: Set priority levels for jobs to ensure critical tasks are processed first.

- [x] **Concurrency Management**: Control the number of concurrent jobs per worker to optimize resource utilization.

- [x] **Delayed Jobs**: Schedule jobs to run after a certain delay, enabling future task execution like reminders.

- [x] **Job Throttling & Debouncing**: Prevent overloads and reduce redundant processing by throttling or debouncing jobs.

- [x] **Event-Driven Execution**: Trigger actions based on job events such as completion, failure, or progress updates.

- [x] **Scalable Processing**: Scale jobs across multiple servers for high-throughput and fault-tolerant workflows.

- [x] **Job Lifecycle Hooks**: Use before/after job processing hooks for logging, metrics, or job modification.

- [x] **Atomic and Reliable Processing**: Ensure jobs are processed exactly once through Redis transactions for atomic, reliable workflows.

## Nodes

### BullMQ Trigger

![image](https://github.com/user-attachments/assets/7781e79c-618c-4f87-8da8-0446447c9fbc)


Starts a workflow when a new job is added to the specified queue.

there are two modes for the trigger:
- respond immediately: the trigger will respond immediately with the job data, and mark the job as completed.
- wait for completion: the trigger will wait for the job to be completed before responding with the job data.

Notes: In order to wait for the job to be completed, we must use the **BullMQ Respond** node to mark the job as completed.

### BullMQ 

![image](https://github.com/user-attachments/assets/9d1ab343-d325-45ec-9ca4-83566df70984)


BullMQ node to add a job to the specified queue, wih the ability to pass data to the job and options.

### BullMQ Respond

BullMQ node to mark a job as completed, failed, or delayed.

Notes: The respond node requires the `jobId` and a `lockToken` to mark the job as completed, failed, or delayed. you could get those values from the **BullMQ Trigger** node.

### BullMQ Wait (WIP)

Similar to the Wait node but wait for Queue events instead of webhook

## Roadmap

- [ ] Flow managerment
- [ ] Better error handle
- [ ] Bugs fixes

## Contribution

I would love to see more features and nodes added to this package. If you have any ideas or suggestions, feel free to open an issue or a pull request.

## License

[LICENSE](./LICENSE)
